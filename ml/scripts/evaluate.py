# ml/scripts/evaluate.py

import torch
import yaml
import argparse
import os
from peft import PeftModel
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from typing import Dict, Any

# Ensure the script can find local modules in the 'src' directory.
# This might require adjusting PYTHONPATH or your project structure.
from src.utils.helpers import create_chat_prompt

def main(config_path: str, adapter_path: str) -> None:
    """
    Loads a trained LoRA adapter, evaluates it qualitatively against the teacher model,
    and then merges the adapter into the base student model to create a standalone,
    deployable model.

    Args:
        config_path: Path to the YAML configuration file used for training.
        adapter_path: Path to the directory containing the trained LoRA adapter weights.
    """
    # --- 1. Load Configuration ---
    with open(config_path, 'r') as f:
        config: Dict[str, Any] = yaml.safe_load(f)
    deploy_dir = config['deploy_dir']
    os.makedirs(deploy_dir, exist_ok=True)
    print(f"Deployment directory set to: {deploy_dir}")

    # --- 2. Load Models and Tokenizer ---
    print("\n--- Loading Tokenizer ---")
    tokenizer = AutoTokenizer.from_pretrained(config['student_model_name'], trust_remote_code=True)

    print("\n--- Loading Base Student Model (for merging) ---")
    # Load the base model in a higher precision (bfloat16) for stable merging.
    base_model = AutoModelForCausalLM.from_pretrained(
        config['student_model_name'],
        torch_dtype=torch.bfloat16,
        device_map={'': 1},  # Load student on GPU 1
        trust_remote_code=True,
    )

    print(f"\n--- Applying LoRA adapter from: {adapter_path} ---")
    # Apply the LoRA adapter to the base model to create a PeftModel.
    peft_model = PeftModel.from_pretrained(base_model, adapter_path)
    peft_model.eval()
    print("LoRA adapter applied successfully.")

    print("\n--- Loading Teacher Model (for comparison) ---")
    # Load the teacher model in 4-bit for memory efficiency during evaluation.
    bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16)
    teacher_model = AutoModelForCausalLM.from_pretrained(
        config['teacher_model_name'],
        quantization_config=bnb_config,
        device_map={'': 0},  # Load teacher on GPU 0
        trust_remote_code=True,
    )

    # --- 3. Perform Qualitative Evaluation ---
    eval_samples = [
        {
            "context": "The Normans were a population arising in the medieval Duchy of Normandy from the intermingling between Norse Viking settlers and indigenous West Franks and Gallo-Romans.",
            "question": "The Normans were a blend of what two groups?"
        },
        {
            "context": "Oxygen is a chemical element with symbol O and atomic number 8. It is a member of the chalcogen group on the periodic table.",
            "question": "What is the atomic number of Oxygen?"
        },
        {
            "context": "In 1895, Wilhelm Roentgen discovered X-rays, a form of electromagnetic radiation. His discovery revolutionized medical diagnostics.",
            "question": "Who discovered X-rays?"
        }
    ]

    print("\n" + "="*80)
    print(f"--- QUALITATIVE EVALUATION FOR ADAPTER: {os.path.basename(adapter_path)} ---")
    print("="*80)

    for i, sample in enumerate(eval_samples):
        print(f"\n--- Sample #{i+1} ---")
        formatted_prompt = create_chat_prompt(tokenizer, sample['question'], sample['context'])
        inputs = tokenizer(formatted_prompt, return_tensors="pt").to(peft_model.device)

        with torch.no_grad():
            # Student Inference
            student_output_ids = peft_model.generate(**inputs, max_new_tokens=64, pad_token_id=tokenizer.eos_token_id)[0]
            student_response = tokenizer.decode(student_output_ids[inputs.input_ids.shape[1]:], skip_special_tokens=True)
            
            # Teacher Inference
            inputs_for_teacher = inputs.to(teacher_model.device)  # Move inputs to the other GPU
            teacher_output_ids = teacher_model.generate(**inputs_for_teacher, max_new_tokens=64, pad_token_id=tokenizer.eos_token_id)[0]
            teacher_response = tokenizer.decode(teacher_output_ids[inputs.input_ids.shape[1]:], skip_special_tokens=True)

        print(f"QUESTION: {sample['question']}")
        print(f"🧑‍🏫 Teacher Response: '{teacher_response.strip()}'")
        print(f"🎓 Student Response: '{student_response.strip()}'")

    # --- 4. Merge Adapter and Save for Deployment ---
    print("\n" + "="*80)
    print("--- MERGING ADAPTER FOR DEPLOYMENT ---")
    print("="*80)
    # This combines the LoRA weights with the base model weights to create a new, standard model.
    merged_model = peft_model.merge_and_unload()
    
    print(f"Saving final merged model to: {deploy_dir}")
    merged_model.save_pretrained(deploy_dir)
    tokenizer.save_pretrained(deploy_dir)
    print(f"✅ Final deployable model saved successfully to {deploy_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate, merge, and save a distilled LLM checkpoint.")
    parser.add_argument('--config', type=str, default='configs/distillation_config.yaml', help="Path to the training YAML config file.")
    parser.add_argument('--adapter_path', type=str, required=True, help="Path to the trained LoRA adapter checkpoint directory.")
    args = parser.parse_args()
    main(args.config, args.adapter_path)