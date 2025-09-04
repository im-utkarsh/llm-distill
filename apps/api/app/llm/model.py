# apps/api/app/llm/model.py
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer

# --- Configuration ---

# The identifier for the distilled model on the Hugging Face Hub.
MODEL_ID = "im-utkarsh/distilled-gemma-squad-model"

# Automatically select the best available device (GPU or CPU).
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# --- Model and Tokenizer Loading ---

print(f"Loading model from: {MODEL_ID} on {DEVICE}...")

# Load the pre-trained model from the Hugging Face Hub.
# `from_pretrained` handles downloading and caching.
# Using bfloat16 for reduced memory footprint and faster inference on compatible GPUs.
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.bfloat16,
    device_map=DEVICE
)

# Load the corresponding tokenizer.
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

print("✅ Model and tokenizer loaded successfully.")

# --- Generation Utilities ---

def get_generation_kwargs(inputs: torch.Tensor, streamer: TextIteratorStreamer) -> dict:
    """
    Constructs a dictionary of arguments for the model.generate() method.
    This centralizes generation parameters for consistency.

    Args:
        inputs: The tokenized input tensor for the model.
        streamer: The streamer object to handle token-by-token output.

    Returns:
        A dictionary of keyword arguments for model generation.
    """
    return {
        "input_ids": inputs,
        "streamer": streamer,
        "max_new_tokens": 1024,      # Max length of the generated response.
        "do_sample": True,           # Enable sampling-based generation.
        "temperature": 0.7,          # Controls randomness: lower is more deterministic.
        "top_k": 50,                 # Considers only the top k most likely tokens.
        "top_p": 0.95,               # Nucleus sampling: considers tokens from the cumulative probability mass.
        "pad_token_id": tokenizer.eos_token_id  # Prevents warnings for open-ended generation.
    }