# ml/scripts/train_distill.py

import torch
import yaml
import argparse
import os
import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

from huggingface_hub import login
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    BitsAndBytesConfig,
    PreTrainedTokenizerBase,
)
from transformers.utils import PaddingStrategy

from datasets import load_dataset, Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType
from tqdm import tqdm

# Import local modules
from src.model.distillation_trainer import DistillationModel, DistillationTrainer
from src.utils.helpers import set_seed, create_chat_prompt

@dataclass
class CustomDataCollator:
    """
    A custom data collator to handle padding for Causal LM training.

    The default `DataCollatorForLanguageModeling` pads labels with the tokenizer's
    pad_token_id, which would be included in the loss calculation. This collator
    ensures that padded label tokens are set to -100, so they are ignored by
    the loss function.
    
    Attributes:
        tokenizer: The tokenizer used for encoding the data.
        padding: The padding strategy.
        max_length: The maximum length to pad to.
        pad_to_multiple_of: Pad to a multiple of this value.
    """
    tokenizer: PreTrainedTokenizerBase
    padding: Union[bool, str, PaddingStrategy] = True
    max_length: Optional[int] = None
    pad_to_multiple_of: Optional[int] = None

    def __call__(self, features: List[Dict[str, Any]]) -> Dict[str, Any]:
        # Separate labels before padding the rest of the features.
        labels = [feature.pop("labels") for feature in features]

        # Use the tokenizer's built-in padding for input_ids, attention_mask, etc.
        batch = self.tokenizer.pad(
            features,
            padding=self.padding,
            max_length=self.max_length,
            pad_to_multiple_of=self.pad_to_multiple_of,
            return_tensors="pt",
        )

        # Manually pad the labels with -100 to the same length as the inputs.
        label_padding_len = batch["input_ids"].shape[1]
        padded_labels = [label + [-100] * (label_padding_len - len(label)) for label in labels]
        batch["labels"] = torch.tensor(padded_labels, dtype=torch.long)

        return batch

def main(config_path: str, secrets_path: str) -> None:
    """
    Main function to run the on-the-fly LLM distillation process.

    Args:
        config_path: Path to the main YAML configuration file.
        secrets_path: Path to the YAML file containing secrets like API tokens.
    """
    # --- 1. Load Configuration & Setup ---
    print("--- Loading Configuration ---")
    with open(config_path, 'r') as f:
        config: Dict[str, Any] = yaml.safe_load(f)
    
    with open(secrets_path, 'r') as f:
        secrets: Dict[str, Any] = yaml.safe_load(f)

    # Log in to Hugging Face Hub if a token is provided.
    login_token = config.get('login_token') or secrets.get('login_token')
    if login_token:
        login(token=login_token)
    
    set_seed(config['seed'])
    
    # --- 2. Load Tokenizer ---
    print("--- Loading Tokenizer ---")
    tokenizer = AutoTokenizer.from_pretrained(config['student_model_name'], trust_remote_code=True)
    
    # Set pad token if not present. Use EOS token and left-padding for generation.
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.padding_side = 'left'

    # --- 3. Load Models ---
    print("--- Loading Teacher and Student models ---")
    # Configure 4-bit quantization for memory efficiency.
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # Load Teacher Model (quantized) on GPU 0.
    teacher_model = AutoModelForCausalLM.from_pretrained(
        config['teacher_model_name'],
        quantization_config=bnb_config,
        device_map={'': 0},  # Pin to GPU 0
        trust_remote_code=True,
    )
    teacher_model.eval()  # Teacher is only used for inference.
    print(f"Teacher Model '{config['teacher_model_name']}' loaded on {teacher_model.device}")

    # Load Student Model (quantized) on GPU 1.
    student_model = AutoModelForCausalLM.from_pretrained(
        config['student_model_name'],
        quantization_config=bnb_config,
        device_map={'': 1},  # Pin to GPU 1
        trust_remote_code=True,
    )
    student_model = prepare_model_for_kbit_training(student_model)
    student_model.config.use_cache = False  # Required for gradient checkpointing
    
    # Configure LoRA for parameter-efficient fine-tuning.
    lora_config = LoraConfig(
        r=config['lora_r'],
        lora_alpha=config['lora_alpha'],
        lora_dropout=config['lora_dropout'],
        bias="none",
        task_type=TaskType.CAUSAL_LM,
        target_modules=config['lora_target_modules'],
    )
    student_model_lora = get_peft_model(student_model, lora_config)
    print(f"Student Model '{config['student_model_name']}' loaded on {student_model_lora.device}")
    student_model_lora.print_trainable_parameters()

    # Wrap student in the DistillationModel to handle layer projections.
    distillation_model = DistillationModel(
        student_model=student_model_lora,
        teacher_config=teacher_model.config,
        layer_mapping=config['layer_mapping'],
    ).to(student_model_lora.device)
    
    # --- 4. Load and Process Dataset ---
    print("\n--- Loading and preparing dataset ---")
    dataset = load_dataset(config['dataset_name'], split=config['dataset_slice'])
    print(f"Original dataset size: {len(dataset)}")

    def preprocess_function(example: Dict) -> Optional[Dict]:
        """
        Preprocesses a single SQuAD example into a format suitable for Causal LM training.
        This function tokenizes the data and creates labels for teacher-student training.
        """
        try:
            # Basic data cleaning and validation.
            if not example['answers']['text']: return None
            question = example['question'].strip()
            context = example['context'].strip()
            answer = example['answers']['text'][0].strip()
            if not all([question, context, answer]): return None

            # Construct the prompt and add EOS token for proper sequence termination.
            prompt = create_chat_prompt(tokenizer, question, context)
            answer_with_eos = answer + tokenizer.eos_token
            
            # Tokenize prompt and answer to calculate lengths for label masking.
            prompt_tokens = tokenizer(prompt, add_special_tokens=False)
            answer_tokens = tokenizer(answer_with_eos, add_special_tokens=False)
            
            input_ids = prompt_tokens['input_ids'] + answer_tokens['input_ids']
            prompt_len = len(prompt_tokens['input_ids'])

            # Truncate long examples and skip examples where the prompt alone is too long.
            if len(input_ids) > config['max_seq_length']:
                input_ids = input_ids[:config['max_seq_length']]
            if prompt_len >= config['max_seq_length']:
                return None

            # Create labels: mask prompt tokens with -100 so they are ignored in the loss.
            labels = [-100] * prompt_len + input_ids[prompt_len:]
            
            return {"input_ids": input_ids, "attention_mask": [1] * len(input_ids), "labels": labels}
        except Exception as e:
            print(f"Error processing example: {e}")
            return None
    
    # Use a generator for memory-efficient, on-the-fly preprocessing.
    def data_generator():
        for example in tqdm(dataset, desc="Processing examples"):
            processed = preprocess_function(example)
            if processed is not None:
                yield processed

    processed_dataset = Dataset.from_generator(data_generator, num_proc=os.cpu_count())
    if len(processed_dataset) == 0:
        raise ValueError("CRITICAL: Dataset is empty after processing. Check preprocessing logic.")

    # Split data into training and evaluation sets.
    split_data = processed_dataset.train_test_split(train_size=config['train_split_size'], seed=config['seed'])
    train_dataset, eval_dataset = split_data['train'], split_data['test']
    print(f"Dataset prepared: {len(train_dataset)} training, {len(eval_dataset)} evaluation examples.")
 
    # --- 5. Setup Trainer ---
    # Calculate total training steps based on epochs to ensure full training.
    effective_batch_size = config['per_device_train_batch_size'] * config['gradient_accumulation_steps']
    max_steps = math.ceil(len(train_dataset) / effective_batch_size) * config.get('num_train_epochs', 1)
    
    training_args = TrainingArguments(
        output_dir=config['output_dir'],
        per_device_train_batch_size=config['per_device_train_batch_size'],
        per_device_eval_batch_size=config['per_device_train_batch_size'],
        gradient_accumulation_steps=config['gradient_accumulation_steps'],
        learning_rate=float(config['learning_rate']),
        max_steps=max_steps,
        optim=config['optim'],
        logging_steps=config['logging_steps'],
        save_strategy="steps",
        save_steps=config['save_steps'],
        eval_strategy="steps",
        eval_steps=config['eval_steps'],
        bf16=True,  # Use bfloat16 for mixed-precision training.
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        report_to="none",
        remove_unused_columns=False, # Required for the custom trainer.
        dataloader_num_workers=4,
    )

    trainer = DistillationTrainer(
        model=distillation_model,
        teacher_model=teacher_model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        data_collator=CustomDataCollator(tokenizer=tokenizer),
        alpha_ce=config['alpha_ce'],
        beta_mse=config['beta_mse'],
        gamma_kl=config['gamma_kl'],
        temperature=config['temperature'],
        normalize_hidden=config.get('normalize_hidden_states', False),
    )

    # --- 6. Train ---
    print("\n--- Starting Student Model Distillation Training ---")
    trainer.train()
    print("\n--- Training Complete! ---")

    # Save the best-performing LoRA adapter.
    best_adapter_path = os.path.join(config['output_dir'], "best_model_adapter")
    trainer.save_model(best_adapter_path)
    print(f"✅ Best LoRA adapter saved to {best_adapter_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="On-the-Fly LLM Distillation Training")
    parser.add_argument('--config', type=str, default='configs/distillation_config.yaml', help="Path to the YAML config file.")
    parser.add_argument('--secrets', type=str, default='configs/secrets.yaml', help="Path to the YAML secrets file.")
    args = parser.parse_args()
    main(args.config, args.secrets)