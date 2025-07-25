# apps/api/app/llm/model.py
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TextIteratorStreamer
import os

# --- Configuration ---
# The ID of your model repository on the Hugging Face Hub
MODEL_ID = "im-utkarsh/distilled-gemma-squad-model"

# Use "cuda" if a GPU is available, otherwise fall back to "cpu".
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# --- Model and Tokenizer Loading ---
print(f"Loading model from: {MODEL_ID} on {DEVICE}...")

# Load the model directly from the Hub.
# `from_pretrained` will download and cache the model for you.
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.bfloat16,
    device_map=DEVICE
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

print("✅ Model and tokenizer loaded successfully.")

# --- Generation Utilities ---
def get_generation_kwargs(inputs: torch.Tensor, streamer: TextIteratorStreamer) -> dict:
    """
    Constructs a dictionary of arguments for the model.generate() method.
    """
    return {
        "input_ids": inputs,
        "streamer": streamer,
        "max_new_tokens": 1024,
        "do_sample": True,
        "temperature": 0.7,
        "top_k": 50,
        "top_p": 0.95,
        "pad_token_id": tokenizer.eos_token_id
    }