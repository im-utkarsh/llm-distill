# ml/scripts/quantitative_eval.py

import torch
import yaml
import argparse
import os
import pandas as pd
import time
import evaluate
import gc
import numpy as np
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig,
    PreTrainedModel,
    PreTrainedTokenizer,
)
from datasets import Dataset
from tqdm import tqdm
from typing import Tuple, Dict, Any

from src.utils.helpers import create_chat_prompt, set_seed

# --- Helper Functions ---

def get_model_size_info(model: PreTrainedModel, model_path: str) -> Tuple[float, float]:
    """
    Calculates model parameters and size on disk.
    
    Args:
        model: The loaded Hugging Face model.
        model_path: The path to the directory where the model is saved.
    
    Returns:
        A tuple containing (total parameters in millions, disk size in MB).
    """
    total_params = sum(p.numel() for p in model.parameters()) / 1e6
    disk_size = sum(f.stat().st_size for f in os.scandir(model_path) if f.is_file()) / (1024 ** 2)
    return total_params, disk_size

def measure_inference_metrics(model: PreTrainedModel, tokenizer: PreTrainedTokenizer, dataset: Dataset, device: str) -> Tuple[float, float, float]:
    """
    Measures average latency, throughput, and peak GPU memory usage for inference.
    
    Args:
        model: The model to evaluate.
        tokenizer: The tokenizer for the model.
        dataset: The dataset to use for evaluation.
        device: The torch device to run inference on (e.g., "cuda:0").
    
    Returns:
        A tuple containing (avg latency in ms, throughput in ex/sec, peak VRAM in MB).
    """
    latencies = []
    model.eval()
    
    # Warm-up run to load CUDA kernels, not included in measurement.
    warmup_prompt = create_chat_prompt(tokenizer, dataset[0]['question'], dataset[0]['context'])
    inputs = tokenizer(warmup_prompt, return_tensors="pt").to(device)
    with torch.no_grad():
        _ = model.generate(**inputs, max_new_tokens=50, pad_token_id=tokenizer.eos_token_id)
    torch.cuda.synchronize()

    # Measure memory and speed over the dataset.
    torch.cuda.reset_peak_memory_stats(device)
    start_time = time.time()

    for example in tqdm(dataset, desc=f"Measuring speed for {model.config._name_or_path}"):
        prompt = create_chat_prompt(tokenizer, example['question'], example['context'])
        inputs = tokenizer(prompt, return_tensors="pt", max_length=1024, truncation=True).to(device)
        
        iter_start = time.time()
        with torch.no_grad():
            _ = model.generate(**inputs, max_new_tokens=50, pad_token_id=tokenizer.eos_token_id)
        torch.cuda.synchronize()  # Wait for GPU generation to complete.
        iter_end = time.time()
        latencies.append(iter_end - iter_start)

    end_time = time.time()
    peak_memory_used = torch.cuda.max_memory_allocated(device) / (1024 ** 2)

    avg_latency = np.mean(latencies) * 1000  # Convert to milliseconds
    throughput = len(dataset) / (end_time - start_time) # examples/sec
    return avg_latency, throughput, peak_memory_used

def evaluate_qa_performance(model: PreTrainedModel, tokenizer: PreTrainedTokenizer, dataset: Dataset) -> Tuple[float, float]:
    """
    Computes Exact Match (EM) and F1 Score for Question Answering using the SQuAD metric.
    
    Args:
        model: The model to evaluate.
        tokenizer: The tokenizer for the model.
        dataset: The SQuAD-formatted dataset.
        
    Returns:
        A tuple containing (Exact Match score, F1 score).
    """
    squad_metric = evaluate.load("squad")
    predictions = []
    references = []

    for example in tqdm(dataset, desc=f"Evaluating QA for {model.config._name_or_path}"):
        prompt = create_chat_prompt(tokenizer, example['question'], example['context'])
        inputs = tokenizer(prompt, return_tensors="pt", max_length=1024, truncation=True).to(model.device)
        
        with torch.no_grad():
            outputs = model.generate(**inputs, max_new_tokens=50, pad_token_id=tokenizer.eos_token_id)
        
        # Decode only the newly generated tokens, skipping the prompt.
        prediction_text = tokenizer.decode(outputs[0, inputs.input_ids.shape[1]:], skip_special_tokens=True).strip()
        
        # SQuAD metric script requires a non-empty prediction.
        if not prediction_text:
            prediction_text = " "

        predictions.append({'id': example['id'], 'prediction_text': prediction_text})
        references.append({'id': example['id'], 'answers': example['answers']})
            
    results = squad_metric.compute(predictions=predictions, references=references)
    return results['exact_match'], results['f1']

# --- Main Execution ---

def main(config_path: str, student_model_path: str) -> None:
    """
    Runs a comprehensive quantitative evaluation comparing a distilled student model
    against its teacher model on performance and QA metrics.

    Args:
        config_path: Path to the YAML configuration file.
        student_model_path: Path to the final, merged student model directory.
    """
    # --- 1. Load Configuration & Set Seed ---
    with open(config_path, 'r') as f:
        config: Dict[str, Any] = yaml.safe_load(f)
    set_seed(config['seed'])
    
    # --- 2. Load Evaluation Dataset ---
    # Use a small slice of the validation set for quick yet representative evaluation.
    eval_dataset = load_dataset(config['dataset_name'], split="validation[:100]")
    
    # --- 3. Evaluate Distilled Student Model ---
    print("\n--- ❶ Evaluating Distilled Student Model ---")
    student_device = "cuda:1"  # Use second GPU for student
    student_model = AutoModelForCausalLM.from_pretrained(
        student_model_path,
        torch_dtype=torch.bfloat16,
        device_map=student_device,
        trust_remote_code=True
    )
    student_tokenizer = AutoTokenizer.from_pretrained(student_model_path, trust_remote_code=True)
    if student_tokenizer.pad_token is None: student_tokenizer.pad_token = student_tokenizer.eos_token
    student_tokenizer.padding_side = 'left' # Set for generation

    student_params, student_disk_size = get_model_size_info(student_model, student_model_path)
    student_latency, student_throughput, student_mem = measure_inference_metrics(student_model, student_tokenizer, eval_dataset, student_device)
    student_em, student_f1 = evaluate_qa_performance(student_model, student_tokenizer, eval_dataset)
    
    # Clean up memory before loading the next model.
    del student_model
    gc.collect()
    torch.cuda.empty_cache()

    # --- 4. Evaluate Original Teacher Model ---
    print("\n--- ❷ Evaluating Original Teacher Model ---")
    teacher_device = "cuda:0"  # Use first GPU for teacher
    teacher_tokenizer = AutoTokenizer.from_pretrained(config['teacher_model_name'], trust_remote_code=True)
    bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16)
    teacher_model = AutoModelForCausalLM.from_pretrained(
        config['teacher_model_name'],
        quantization_config=bnb_config,
        device_map=teacher_device,
        trust_remote_code=True
    )
    if teacher_tokenizer.pad_token is None: teacher_tokenizer.pad_token = teacher_tokenizer.eos_token
    teacher_tokenizer.padding_side = 'left'
    
    teacher_params = teacher_model.num_parameters() / 1e6
    teacher_latency, teacher_throughput, teacher_mem = measure_inference_metrics(teacher_model, teacher_tokenizer, eval_dataset, teacher_device)
    teacher_em, teacher_f1 = evaluate_qa_performance(teacher_model, teacher_tokenizer, eval_dataset)

    del teacher_model
    gc.collect()
    torch.cuda.empty_cache()

    # --- 5. Compile and Display Results ---
    results_data = {
        "Metric": [
            "Total Parameters (M)", "Disk Size (MB)", "Avg. Latency (ms/ex)",
            "Throughput (ex/sec)", "Peak VRAM (MB)", "Exact Match (%)", "F1 Score (%)"
        ],
        f"Teacher ({config['teacher_model_name']})": [
            f"{teacher_params:,.0f}", "N/A (4-bit)", f"{teacher_latency:.2f}",
            f"{teacher_throughput:.2f}", f"{teacher_mem:.2f}", f"{teacher_em:.2f}", f"{teacher_f1:.2f}"
        ],
        f"Student (Distilled {config['student_model_name']})": [
            f"{student_params:,.0f}", f"{student_disk_size:.2f}", f"{student_latency:.2f}",
            f"{student_throughput:.2f}", f"{student_mem:.2f}", f"{student_em:.2f}", f"{student_f1:.2f}"
        ]
    }
    results_df = pd.DataFrame(results_data)
    
    # --- Display and Save Results ---
    report_str = f"""
==========================================================================================
                            COMPREHENSIVE EVALUATION RESULTS
==========================================================================================
{results_df.to_string(index=False)}
=========================================================================================="""
    print(report_str)
    
    with open("evaluation_results.txt", "w") as f:
        f.write(report_str)
    print("\nResults saved to evaluation_results.txt")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Comprehensive Evaluation for a Distilled LLM")
    parser.add_argument('--config', type=str, default='configs/distillation_config.yaml', help="Path to the YAML config file.")
    parser.add_argument('--student_model_path', type=str, required=True, help="Path to the final, merged student model directory.")
    args = parser.parse_args()
    main(args.config, args.student_model_path)