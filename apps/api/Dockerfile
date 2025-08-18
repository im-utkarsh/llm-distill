# backend/Dockerfile

# --- Stage 1: Builder ---
# Use a specific, slim version for a smaller and more secure final image.
FROM python:3.11-slim AS builder

# Set working directory for the virtual environment
WORKDIR /opt/venv

# Prevent Python from writing .pyc files and disable output buffering
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create the virtual environment
RUN python3 -m venv .
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install requirements.
# Using --no-cache-dir reduces the layer size.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# --- Stage 2: Runtime ---
# This stage creates the final, lean production image by copying the
# virtual environment and application code from the builder stage.
FROM python:3.11-slim

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY ./app /app/app

# Activate the virtual environment and switch to the non-root user.
ENV PATH="/opt/venv/bin:$PATH"

RUN useradd --create-home --shell /bin/bash appuser
USER appuser

# Expose the port Hugging Face expects.
EXPOSE 7860

# Run the application on port 7860.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]