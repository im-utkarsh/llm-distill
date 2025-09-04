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

def run_inference_sync(job: Dict[str, Any], loop: asyncio.AbstractEventLoop, cancellation_requests: Set[str]):
    """
    Synchronous function to run model generation. Designed to be executed in a
    separate thread to avoid blocking the main asyncio event loop.
    
    Args:
        job: A dictionary containing job details (prompt, context, client_id, response_queue).
        loop: The running asyncio event loop to safely put items into the queue.
        cancellation_requests: A shared set to check if the job has been cancelled.
    """
    client_id = job["client_id"]
    response_queue = job["response_queue"]

    try:
        # Step 1: Create the chat prompt using the model's template.
        messages = [{"role": "user", "content": f"Context: {job['context']}\n\nQuestion: {job['prompt']}"}] if job["context"] else [{"role": "user", "content": job["prompt"]}]
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)

        # Early exit if a cancellation was requested before processing.
        if client_id in cancellation_requests:
            logging.info(f"Cancellation for {client_id} detected before tokenization.")
            return

        # Step 2: Prepare model inputs.
        inputs = tokenizer.apply_chat_template(
            messages,
            tokenize=True,
            add_generation_prompt=True,
            return_tensors="pt",
        ).to(model.device)
        generation_kwargs = get_generation_kwargs(inputs, streamer)

        # Step 3: Start model generation in a separate thread.
        # This allows us to process the streamer iterator while the model generates tokens.
        generation_thread = Thread(target=model.generate, kwargs=generation_kwargs)
        generation_thread.start()

        # Step 4: Stream tokens, applying logic to strip conversational prefixes.
        # This logic attempts to remove boilerplate like "Sure, here is the answer:"
        # to provide a cleaner response to the user.
        buffer = ""
        state = "INITIAL"  # States: INITIAL -> BUFFERING -> STREAMING
        WORD_LIMIT = 15
        TRIGGER_PHRASE = "Sure,"
        DELIMITER = ":\n\n"
        was_cancelled = False

        for token in streamer:
            # Check for cancellation during the streaming loop.
            if client_id in cancellation_requests:
                logging.info(f"Cancellation for {client_id} detected during token streaming.")
                was_cancelled = True
                break

            # If prefix stripping is complete, directly send the token.
            if state == "STREAMING":
                future = asyncio.run_coroutine_threadsafe(response_queue.put({"token": token}), loop)
                future.result() # Wait for the put to complete.
                continue

            # Buffer tokens and check conditions for stripping the prefix.
            buffer += token

            if state == "INITIAL":
                trimmed_buffer = buffer.strip()
                if trimmed_buffer.startswith(TRIGGER_PHRASE):
                    state = "BUFFERING" # Trigger phrase found, now look for delimiter.
                elif len(trimmed_buffer) > len(TRIGGER_PHRASE):
                    # If it's clear the stream won't have the prefix, flush buffer and start streaming.
                    asyncio.run_coroutine_threadsafe(response_queue.put({"token": buffer}), loop).result()
                    state = "STREAMING"

            if state == "BUFFERING":
                if DELIMITER in buffer:
                    # Delimiter found, discard prefix and send the rest.
                    parts = buffer.split(DELIMITER, 1)
                    if len(parts) > 1 and parts[1]:
                       asyncio.run_coroutine_threadsafe(response_queue.put({"token": parts[1]}), loop).result()
                    state = "STREAMING"
                elif len(buffer.strip().split()) >= WORD_LIMIT:
                    # As a fallback, if too many words are buffered without finding the
                    # delimiter, assume there is no delimiter and start streaming.
                    asyncio.run_coroutine_threadsafe(response_queue.put({"token": buffer}), loop).result()
                    state = "STREAMING"

        generation_thread.join()

        # Step 5: Finalize the stream.
        if was_cancelled:
            cancellation_requests.discard(client_id)
        else:
            # If the stream ended before the "STREAMING" state was reached, flush the buffer.
            if state != "STREAMING" and buffer:
                asyncio.run_coroutine_threadsafe(response_queue.put({"token": buffer}), loop)
            # Send the 'end' event to signal completion to the client.
            asyncio.run_coroutine_threadsafe(response_queue.put({"event": "end"}), loop)

    except Exception as e:
        logging.error(f"Error during inference for client {job.get('client_id', 'unknown')}: {e}", exc_info=True)
        # Ensure the stream is properly closed even if an error occurs.
        if 'response_queue' in locals() and 'loop' in locals():
            asyncio.run_coroutine_threadsafe(response_queue.put({"event": "end"}), loop)
    finally:
        # Clean up any lingering cancellation requests for this client.
        if 'client_id' in locals() and client_id in cancellation_requests:
            cancellation_requests.discard(client_id)

async def fifo_inference_worker(app: FastAPI):
    """
    A long-running worker that pulls inference jobs from a queue (First-In, First-Out)
    and dispatches them to be run in a separate thread.
    """
    loop = asyncio.get_running_loop()
    logging.info("🚀 Inference worker started and is listening for jobs...")
    while True:
        # Wait for a job to be added to the queue.
        job = await app.state.inference_queue.get()
        client_id = job["client_id"]

        # Before starting, check if the job was cancelled while in the queue.
        if client_id in app.state.cancellation_requests:
            logging.info(f"Job for {client_id} cancelled before processing.")
            app.state.cancellation_requests.discard(client_id)
            app.state.inference_queue.task_done()
            continue

        logging.info(f"Worker processing job for client {client_id}. Queue size: {app.state.inference_queue.qsize()}")
        
        # `run_in_executor` runs the synchronous function in a thread pool.
        task = functools.partial(run_inference_sync, job, loop, app.state.cancellation_requests)
        await loop.run_in_executor(None, task)

        app.state.inference_queue.task_done()
        logging.info(f"Worker finished job for client {client_id}.")