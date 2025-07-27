# apps/api/app/llm/services.py
import asyncio
import torch
import functools
import logging
from threading import Thread
from typing import Set, Dict, Any
from fastapi import FastAPI
from transformers import TextIteratorStreamer

from .model import model, tokenizer, get_generation_kwargs

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def run_inference_sync(job: Dict[str, Any], loop: asyncio.AbstractEventLoop, cancellation_requests: Set[str]):
    """Synchronous function to run model generation in a separate thread."""
    client_id = job["client_id"]
    response_queue = job["response_queue"]

    messages = [{"role": "user", "content": f"Context: {job['context']}\n\nQuestion: {job['prompt']}"}] if job["context"] else [{"role": "user", "content": job["prompt"]}]
    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

    inputs = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_tensors="pt").to(model.device)
    generation_kwargs = get_generation_kwargs(inputs, streamer)

    generation_thread = Thread(target=model.generate, kwargs=generation_kwargs)
    generation_thread.start()

    for token in streamer:
        if client_id in cancellation_requests:
            logging.info(f"Cancellation for {client_id} detected during streaming.")
            cancellation_requests.discard(client_id)
            break
        future = asyncio.run_coroutine_threadsafe(response_queue.put({"token": token}), loop)
        future.result()

    generation_thread.join()
    asyncio.run_coroutine_threadsafe(response_queue.put({"event": "end"}), loop)

async def fifo_inference_worker(app: FastAPI):
    """Pulls inference jobs from a queue and dispatches them."""
    loop = asyncio.get_running_loop()
    logging.info("🚀 Inference worker started...")
    while True:
        job = await app.state.inference_queue.get()
        logging.info(f"Worker processing job for client {job['client_id']}.")
        task = functools.partial(run_inference_sync, job, loop, app.state.cancellation_requests)
        await loop.run_in_executor(None, task)
        app.state.inference_queue.task_done()
        logging.info(f"Worker finished job for client {job['client_id']}.")