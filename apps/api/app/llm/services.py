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

    try:
        messages = [{"role": "user", "content": f"Context: {job['context']}\n\nQuestion: {job['prompt']}"}] if job["context"] else [{"role": "user", "content": job["prompt"]}]
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
        inputs = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_tensors="pt").to(model.device)
        generation_kwargs = get_generation_kwargs(inputs, streamer)

        generation_thread = Thread(target=model.generate, kwargs=generation_kwargs)
        generation_thread.start()

        # --- NEW: Server-side prefix stripping logic ---
        buffer = ""
        state = "INITIAL"
        WORD_LIMIT = 15
        TRIGGER_PHRASE = "Sure,"
        DELIMITER = ":\n\n"
        # ---

        for token in streamer:
            if client_id in cancellation_requests:
                logging.info(f"Cancellation for {client_id} detected during streaming.")
                cancellation_requests.discard(client_id)
                break

            # If we are already streaming, just send the token
            if state == "STREAMING":
                future = asyncio.run_coroutine_threadsafe(response_queue.put({"token": token}), loop)
                future.result()
                continue

            # Otherwise, add to the buffer and check our conditions
            buffer += token

            # Check if the stream starts with the trigger phrase
            if state == "INITIAL":
                trimmed_buffer = buffer.strip()
                if trimmed_buffer.startswith(TRIGGER_PHRASE):
                    state = "BUFFERING"
                # If it's clear the stream doesn't start with the trigger, flush and stream
                elif len(trimmed_buffer) > len(TRIGGER_PHRASE):
                    future = asyncio.run_coroutine_threadsafe(response_queue.put({"token": buffer}), loop)
                    future.result()
                    state = "STREAMING"

            # If we've seen the trigger, look for the delimiter
            if state == "BUFFERING":
                if DELIMITER in buffer:
                    # Delimiter found, discard prefix and send the rest
                    parts = buffer.split(DELIMITER, 1)
                    if len(parts) > 1 and parts[1]:
                       future = asyncio.run_coroutine_threadsafe(response_queue.put({"token": parts[1]}), loop)
                       future.result()
                    state = "STREAMING"
                # If we've buffered too many words without finding the delimiter, flush and stream
                elif len(buffer.strip().split()) >= WORD_LIMIT:
                    future = asyncio.run_coroutine_threadsafe(response_queue.put({"token": buffer}), loop)
                    future.result()
                    state = "STREAMING"

        # If the stream ends while buffering, flush the buffer
        if state != "STREAMING" and buffer:
            asyncio.run_coroutine_threadsafe(response_queue.put({"token": buffer}), loop)

        generation_thread.join()

    except Exception as e:
        logging.error(f"Error during inference for client {client_id}: {e}", exc_info=True)

    finally:
        # Always signal the end to the client
        asyncio.run_coroutine_threadsafe(response_queue.put({"event": "end"}), loop)
        if client_id in cancellation_requests:
            cancellation_requests.discard(client_id)

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