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
    Custom data collator to handle padding of labels.
    The default data collator would pad labels with the tokenizer's pad_token_id,
    but we need to use -100 to ignore these tokens in the loss calculation.
    """
    tokenizer: PreTrainedTokenizerBase
    padding: Union[bool, str, PaddingStrategy] = True
    max_length: Optional[int] = None
    pad_to_multiple_of: Optional[int] = None

    def __call__(self, features: List[Dict[str, Any]]) -> Dict[str, Any]:
        # Isolate labels to handle them separately.
        label_name = "labels"
        labels = [feature.pop(label_name) for feature in features]

        # Pad the remaining features (input_ids, attention_mask)
        batch = self.tokenizer.pad(
            features,
            padding=self.padding,
            max_length=self.max_length,
            pad_to_multiple_of=self.pad_to_multiple_of,
            return_tensors="pt",
        )

        # Manually pad the labels with -100.
        label_padding_len = batch["input_ids"].shape[1]
        
        batch[label_name] = torch.tensor(
            [label + [-100] * (label_padding_len - len(label)) for label in labels],
            dtype=torch.long
        )

        return batch

def main(config_path, secrets_path):
    # --- 1. Load Configuration & Setup ---
    print("--- Loading Configuration ---")
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    with open(secrets_path, 'r') as f:
        secrets = yaml.safe_load(f)

    if config.get('login_token'):
        login(token=config['login_token'])

    if secrets.get('login_token'):
        login(token=secrets['login_token'])
    
    set_seed(config['seed'])
    
    # --- 2. Load Tokenizer ---
    print("--- Loading Tokenizer ---")
    tokenizer = AutoTokenizer.from_pretrained(config['student_model_name'], trust_remote_code=True)
    
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

    # Load Teacher Model on GPU 0.
    teacher_model = AutoModelForCausalLM.from_pretrained(
        config['teacher_model_name'],
        quantization_config=bnb_config,
        device_map={'': 0}, # Pin to specific device
        trust_remote_code=True,
    )
    teacher_model.eval() # Teacher is only for inference.
    print(f"Teacher Model '{config['teacher_model_name']}' loaded on {teacher_model.device}")

    # Load Student Model on GPU 1.
    student_model = AutoModelForCausalLM.from_pretrained(
        config['student_model_name'],
        quantization_config=bnb_config,
        device_map={'': 1}, # Pin to specific device
        trust_remote_code=True,
    )
    # Prepare the quantized model for training.
    student_model = prepare_model_for_kbit_training(student_model)
    student_model.config.use_cache = False
    
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

    # Wrap student in the DistillationModel to handle projections.
    distillation_model = DistillationModel(
        student_model=student_model_lora,
        teacher_config=teacher_model.config,
        layer_mapping=config['layer_mapping'],
    ).to(student_model_lora.device)
    
    # --- 4. Load and Process Dataset ---
    print("\n--- Loading and preparing dataset ---")
    dataset = load_dataset(
        config['dataset_name'],
        split=config['dataset_slice'],
    )
    print(f"Original dataset size: {len(dataset)}")

    def preprocess_function(example):
        """
        Preprocesses a single SQuAD example into a format suitable for Causal LM training.
        """
        try:
            # Filter out examples with no answer text.
            if not example['answers']['text']:
                return None
            
            question = example['question'].strip()
            context = example['context'].strip()
            # Use the first provided answer.
            answer = example['answers']['text'][0].strip()

            # Filter out examples with empty fields.
            if not all([question, context, answer]):
                return None

            # Construct the full prompt and add EOS token to the answer.
            prompt = create_chat_prompt(tokenizer, question, context)
            answer_with_eos = answer + tokenizer.eos_token
            
            # Tokenize prompt and answer separately to calculate prompt length.
            prompt_tokens = tokenizer(prompt, add_special_tokens=False)
            answer_tokens = tokenizer(answer_with_eos, add_special_tokens=False)
            
            # Combine tokenized inputs.
            input_ids = prompt_tokens['input_ids'] + answer_tokens['input_ids']
            
            # Truncate if the combined length exceeds max_seq_length.
            if len(input_ids) > config['max_seq_length']:
                input_ids = input_ids[:config['max_seq_length']]

            attention_mask = [1] * len(input_ids)
            prompt_len = len(prompt_tokens['input_ids'])

            # Filter out examples where the prompt itself is too long.
            if prompt_len >= config['max_seq_length']:
                return None

            # Create labels: mask prompt tokens with -100.
            labels = input_ids.copy()
            labels[:prompt_len] = [-100] * prompt_len
            
            return {"input_ids": input_ids, "attention_mask": attention_mask, "labels": labels}
        except Exception as e:
            # Gracefully handle any unexpected errors during processing.
            print(f"Error processing example: {e}")
            return None
    
    # Use a generator to process the dataset on-the-fly, which is memory-efficient.
    def data_generator():
        for example in tqdm(dataset, desc="Processing examples"):
            processed = preprocess_function(example)
            if processed is not None:
                yield processed

    # Use datasets.from_generator for efficient, parallelized preprocessing.
    processed_dataset = Dataset.from_generator(data_generator, num_proc=20) 
    
    if len(processed_dataset) == 0:
        raise ValueError("CRITICAL: Dataset is empty after processing. Check preprocessing logic.")

    # Split the processed data into training and evaluation sets.
    split_data = processed_dataset.train_test_split(train_size=config['train_split_size'], seed=config['seed'])
    train_dataset = split_data['train']
    eval_dataset = split_data['test']
    print(f"Dataset prepared: {len(train_dataset)} training, {len(eval_dataset)} evaluation examples.")
 
    # --- 5. Setup Trainer ---
    
    # Calculate total steps to ensure training completes for the specified number of epochs.
    effective_batch_size = config['per_device_train_batch_size'] * config['gradient_accumulation_steps']
    max_steps = math.ceil(len(train_dataset) / effective_batch_size) * config.get('num_train_epochs', 1)
    print(f"Calculated `max_steps` for training: {max_steps}")

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
        bf16=True, # Use bfloat16 for mixed-precision training.
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        report_to="none", # Disable reporting to wandb/etc.
        remove_unused_columns=False, # Required for our custom trainer.
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
    print("\nStarting student model distillation training...")
    trainer.train()
    print("Training complete!")

    # Save the best model's adapter
    best_adapter_path = os.path.join(config['output_dir'], "best_model_adapter")
    trainer.save_model(best_adapter_path)
    print(f"Best LoRA adapter saved to {best_adapter_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="On-the-Fly LLM Distillation Training")
    parser.add_argument(
        '--config', 
        type=str, 
        default='configs/distillation_config.yaml', 
        help="Path to the YAML config file."
    )
    parser.add_argument(
        '--secrets', 
        type=str, 
        default='configs/secrets.yaml', 
        help="Path to the YAML config file."
    )
    args = parser.parse_args()
    main(args.config, args.secrets)