
# 🤖 Machine Learning Pipeline for LLM Distillation

Welcome to the machine learning core of the project. This directory contains all the necessary scripts and configurations to perform knowledge distillation from a large "teacher" LLM to a smaller "student" LLM.

The primary goal of this pipeline is to reproduce the training and evaluation of the `im-utkarsh/distilled-gemma-squad-model`. For an overview of the entire project, including the API and UI, please refer to the [**root README.md**](../README.md).

---

## 📋 Table of Contents

- [🤖 Machine Learning Pipeline for LLM Distillation](#-machine-learning-pipeline-for-llm-distillation)
	- [📋 Table of Contents](#-table-of-contents)
	- [⚙️ Setup and Installation](#️-setup-and-installation)
		- [Prerequisites](#prerequisites)
		- [Installation Steps](#installation-steps)
	- [🔬 The Distillation Pipeline](#-the-distillation-pipeline)
		- [1. Configuration](#1-configuration)
		- [Step 2: Run Distillation Training](#step-2-run-distillation-training)
		- [Step 3: Evaluate and Merge the Model](#step-3-evaluate-and-merge-the-model)
		- [Step 4: Run Quantitative Benchmarking](#step-4-run-quantitative-benchmarking)
	- [📊 Performance Results](#-performance-results)
	- [📂 Directory Structure](#-directory-structure)

---

## ⚙️ Setup and Installation

### Prerequisites

-   Python 3.10+
-   An NVIDIA GPU with CUDA support is highly recommended for training.
-   A virtual environment tool like `venv`.

### Installation Steps

1.  **Navigate to the scripts directory:**
    All commands should be run from the `ml/scripts` directory.
    ```bash
    cd ml/scripts
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install the required Python packages:**
    ```bash
    pip install -r requirements.txt
    ```

---

## 🔬 The Distillation Pipeline

The process is broken down into three main, executable steps.

### 1. Configuration

All hyperparameters, model names, and paths are managed in `configs/distillation_config.yaml`. Before running the pipeline, you can review and modify this file to experiment with different settings. Key parameters include:

-   `teacher_model_name`: The HF model ID for the teacher (e.g., `google/gemma-7b-it`).
-   `student_model_name`: The HF model ID for the student (e.g., `google/gemma-2b-it`).
-   `learning_rate`, `lora_r`, `lora_alpha`: Key training and LoRA hyperparameters.
-   `alpha_ce`, `beta_mse`, `gamma_kl`: The weights for the different components of the composite distillation loss function.

### Step 2: Run Distillation Training

This is the main training script. It loads the teacher and student models, processes the SQuAD dataset, and trains the student using a composite loss function to mimic the teacher's logits and hidden states.

**▶️ Command:**

```bash
python train_distill.py --config ../configs/distillation_config.yaml
````

  - **What it does:** Uses the `DistillationTrainer` to train a LoRA adapter on the student model. The trainer computes a weighted loss from:
    1.  **Cross-Entropy Loss (`alpha_ce`):** Standard language modeling loss on the ground-truth answers.
    2.  **KL Divergence Loss (`gamma_kl`):** Aligns the student's output probability distribution with the teacher's.
    3.  **MSE Loss (`beta_mse`):** Matches the student's hidden states to the teacher's corresponding layers.
  - **Output:** The best-performing LoRA adapter is saved to the directory specified by `output_dir` in the config (e.g., `../outputs/distill_results/`).

### Step 3: Evaluate and Merge the Model

After training, the LoRA adapter must be merged into the base student model to create a standalone, deployable artifact. This script also provides a quick qualitative check.

**▶️ Command:**
*(Replace the `--adapter_path` with the actual path to your best checkpoint from the previous step)*

```bash
python evaluate.py \
  --config ../configs/distillation_config.yaml \
  --adapter_path ../outputs/distill_results/checkpoint-XXXX/ # Path to your best adapter
```

  - **What it does:**
    1.  Loads the base student model and applies the trained LoRA adapter.
    2.  Runs a side-by-side qualitative comparison against the teacher model on a few hardcoded SQuAD examples.
    3.  Merges the adapter weights into the base model.
  - **Output:** The final, merged model is saved to the directory specified by `deploy_dir` in the config (e.g., `../distilled-model/`).

### Step 4: Run Quantitative Benchmarking

This final script provides the objective metrics to validate the success of the distillation process. It compares the final student model against the original teacher on performance, speed, and size.

**▶️ Command:**
*(The `--student_model_path` should point to the output directory from the previous merging step)*

```bash
python quantitative_eval.py \
  --config ../configs/distillation_config.yaml \
  --student_model_path ../distilled-model/
```

  - **What it does:**
    1.  Loads both the final student model and the 4-bit quantized teacher model.
    2.  Measures inference latency, throughput, and peak VRAM usage on a sample of the SQuAD validation set.
    3.  Calculates SQuAD performance metrics (Exact Match and F1 Score).
  - **Output:** A comprehensive comparison table is printed to the console and saved to `results.txt`.

-----

## 📊 Performance Results

The quantitative evaluation script produces the following comparison, demonstrating a successful trade-off between performance and efficiency.

| Metric                   | Teacher (`gemma-7b-it`) | Student (Distilled `gemma-2b-it`) | Improvement       |
| ------------------------ | ----------------------- | --------------------------------- | ----------------- |
| **Total Parameters (M)** | 8,538                   | 2,506                             | **70.6% Smaller** |
| **Disk Size (MB)**       | N/A (Loaded 4-bit)      | 4812.98                           | -                 |
| **Avg. Latency (ms/ex)** | 5316.26                 | 1090.09                           | **4.9x Faster**   |
| **Throughput (ex/sec)**  | 0.19                    | 0.92                              | **4.8x Higher**   |
| **Peak VRAM (MB)**       | 6075.04                 | 4815.53                           | **20.7% Less**    |
| **F1 Score (%)**         | 19.69                   | 16.87                             | **-2.82 points**  |

-----

## 📂 Directory Structure

```
ml/
├── configs/
│   ├── distillation_config.yaml  # Main config for the pipeline
│   └── secrets.yaml              # For storing API keys (e.g., HF token)
├── data/
│   └── (Data would be stored here if downloaded manually)
├── notebooks/
│   └── (Jupyter notebooks for exploration and analysis)
├── outputs/
│   └── distill_results/          # Default output for training runs & adapters
├── scripts/
│   ├── train_distill.py          # Step 1: Runs distillation training
│   ├── evaluate.py               # Step 2: Merges adapter and does qualitative eval
│   ├── quantitative_eval.py      # Step 3: Runs final benchmarking
│   ├── requirements.txt          # Python dependencies for the ML pipeline
│   └── src/
│       ├── model/                # Custom model/trainer classes
│       └── utils/                # Helper functions
└── distilled-model/
    └── (Final merged model for deployment is saved here)
```