# /ml - Machine Learning Experimentation

This directory contains all code related to the training, distillation, and evaluation of the language models.

## Structure
- **/scripts**: Contains the primary Python scripts for the ML workflow.
  - `train_distill.py`: The main script to perform knowledge distillation.
  - `evaluate.py`: Script to evaluate the performance of the distilled model.
- **/data**: Should contain data files or scripts to download them.
- **/notebooks**: Jupyter notebooks for exploration and analysis.

## How to Run
1. Navigate to the scripts directory: `cd ml/scripts`
2. Create and activate a virtual environment.
3. Install dependencies: `pip install -r requirements.txt`
4. Run the training script: `python train_distill.py --config path/to/config.yaml`