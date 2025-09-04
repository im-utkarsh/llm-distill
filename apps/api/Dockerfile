# backend/Dockerfile

# --- Stage 1: Builder ---
# This stage installs all dependencies into a virtual environment.
# Using a specific, slim version for a smaller and more secure final image.
FROM python:3.11-slim AS builder

# Set the working directory for creating the virtual environment.
WORKDIR /opt/venv

# Set environment variables to optimize Python's behavior in containers.
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files.
# PYTHONUNBUFFERED: Ensures that Python output is sent straight to the terminal.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create the virtual environment inside the container.
RUN python3 -m venv .
# Add the venv's bin to the PATH, so `pip` and `python` commands use it.
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install Python requirements.
# Using --no-cache-dir reduces the final layer size.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# --- Stage 2: Runtime ---
# This stage creates the final, lean production image by copying only the
# necessary artifacts (the virtual environment and application code) from the builder stage.
FROM python:3.11-slim

# Set the working directory for the application.
WORKDIR /app

# Copy the virtual environment from the builder stage.
COPY --from=builder /opt/venv /opt/venv
# Copy the application source code.
COPY ./app /app/app

# Activate the virtual environment for subsequent commands.
ENV PATH="/opt/venv/bin:$PATH"

# Create a non-root user for security best practices.
# Running as a non-root user mitigates potential container breakout vulnerabilities.
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

# Expose the port the application will run on. Note: The .env.development
# file in the frontend expects port 7860 for local dev.
EXPOSE 7860

# The command to run the application using Uvicorn.
# It binds the server to 0.0.0.0 to be accessible from outside the container.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]