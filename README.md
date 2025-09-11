<!-- README.md -->

# LLM Distillation for Edge Deployment



This project demonstrates the process of **knowledge distillation** to compress a large, powerful Large Language Model (LLM) into a smaller, faster, and more efficient "student" model. The goal is to create a performant model suitable for deployment in resource-constrained environments, such as edge devices, without a catastrophic loss in performance.

We fine-tune a **Google Gemma 7B** (teacher) on the SQuAD dataset and distill its knowledge into a **Gemma 2B** (student) model. The final distilled model is served via a high-performance FastAPI backend and is interactive through a retro-themed React web interface.

---

## 🚀 Live Demos

-   **Frontend UI:** [**llm-distill-ui.onrender.com**](https://llm-distill-ui.onrender.com/)
-   **Backend API (Hugging Face Space):** [**distilled-gemma-squad**](https://huggingface.co/spaces/im-utkarsh/distilled-gemma-squad)
-   **Distilled Model (Hugging Face Hub):** [**distilled-gemma-squad-model**](https://huggingface.co/im-utkarsh/distilled-gemma-squad-model)
-   **Source Code (GitHub):** [**im-utkarsh/llm-distill**](https://github.com/im-utkarsh/llm-distill)

## ✨ Key Features

-   **🧠 Efficient Distillation:** Implements a sophisticated distillation process combining cross-entropy, KL divergence, and hidden state MSE loss to transfer knowledge effectively.
-   **⚡️ High-Performance API:** A fully asynchronous FastAPI backend using Server-Sent Events (SSE) to stream model responses in real-time without blocking.
-   **🖥️ Retro Interactive UI:** A responsive and engaging frontend built with React, Vite, and Tailwind CSS, styled with a classic CRT terminal aesthetic.
-   **🔬 Comprehensive ML Pipeline:** Includes reproducible Python scripts for distillation training (`train_distill.py`), qualitative evaluation (`evaluate.py`), and quantitative benchmarking (`quantitative_eval.py`).
-   **📦 Monorepo Architecture:** A clean, organized monorepo structure containing the `ml` pipeline, `api` server, and `web` client in a single repository for streamlined development.

---

## 📊 Performance Results

The primary goal was to significantly reduce the model's size and improve its speed. The distilled `gemma-2b` model achieves a **~4.9x faster latency** and **~4.8x higher throughput** while using **~20% less VRAM**, with only a minor drop in F1 score on the SQuAD validation set.

| Metric                   | Teacher (`gemma-7b-it`) | Student (Distilled `gemma-2b-it`) | Improvement       |
| ------------------------ | ----------------------- | --------------------------------- | ----------------- |
| **Total Parameters (M)** | 8,538                   | 2,506                             | **70.6% Smaller** |
| **Disk Size (MB)**       | N/A (Loaded 4-bit)      | 4812.98                           | -                 |
| **Avg. Latency (ms/ex)** | 5316.26                 | 1090.09                           | **4.9x Faster**   |
| **Throughput (ex/sec)**  | 0.19                    | 0.92                              | **4.8x Higher**   |
| **Peak VRAM (MB)**       | 6075.04                 | 4815.53                           | **20.7% Less**    |
| **F1 Score (%)**         | 19.69                   | 16.87                             | **-2.82 points**  |

---

## 🏛️ High-Level Architecture

This monorepo contains three core packages: the ML service, the API backend, and the web frontend.

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#0a0a0a",
    "primaryTextColor": "#00ff00",
    "backgroundColor": "#0a0a0a",
    "lineColor": "#FF8C00",
    "primaryBorderColor": "#00ff00",
    "secondaryColor": "#FF8C00"
  }
}}%%
graph TD
  subgraph ML["ml (data & notebooks & scripts)"]
    MLF["data/notebooks"]:::dataCRT
    MLS["scripts: train, eval"]:::scriptCRT
    MLF --> MLS
  end

  subgraph API["apps/api"]
    API_App["API backend (core, llm, config)"]:::apiCRT
    API_App -->|Loads model| ModelCRT
  end

  subgraph WEB["apps/web"]
    WEB_App["Web frontend (components, hooks, UI)"]:::webCRT
    WEB_App -->|Calls API| API_App
  end

  subgraph MODEL["distilled model"]
    ModelCRT["distilled‑gemma‑squad"]:::modelCRT
  end

  MLF -->|Produces model| ModelCRT
  MLS -->|Trains & evaluates| MLF
  WEB_App -->|Serves UI| UsersCRT["Users"]

  subgraph "Deployment: Hugging Face"
    ModelCRT
  end

  subgraph "Deployment: Render"
    API_App
    WEB_App
  end

  class MLF,MLS,API_App,WEB_App,ModelCRT,UsersCRT defaultCRT;

  classDef dataCRT fill:#0a0a0a,stroke:#00ff00,stroke-width:1px,stroke-dasharray: 3 3;
  classDef scriptCRT fill:#0a0a0a,stroke:#00ff00,stroke-width:1px,stroke-dasharray: 3 3;
  classDef apiCRT fill:#0a0a0a,stroke:#00ff00,stroke-width:2px;
  classDef webCRT fill:#0a0a0a,stroke:#00ff00,stroke-width:2px;
  classDef modelCRT fill:#0a0a0a,stroke:#00ff00,stroke-width:2px,stroke-dasharray: 5 3;
  classDef defaultCRT font-family:Monaco,monospace, font-size:12px, color:#00ff00;


````

  - `ml/`: Contains all Python scripts for the data processing, model distillation, and evaluation pipeline.
  - `apps/api/`: A Dockerized FastAPI application that serves the final distilled model.
  - `apps/web/`: A React + Vite frontend that provides a user interface to interact with the model via the API.

-----

## 🛠️ Getting Started: Local Development

### Prerequisites

  - Git
  - Python 3.10+ and a virtual environment tool (`venv`)
  - Node.js 18+ and `npm`
  - (Optional) Docker for containerizing the API

### 1\. Clone the Repository

```bash
git clone [https://github.com/im-utkarsh/llm-distill.git](https://github.com/im-utkarsh/llm-distill.git)
cd llm-distill
```

### 2\. Set Up the Backend API

```bash
# Navigate to the API directory
cd apps/api

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install Python dependencies
pip install -r requirements.txt

# Start the development server
# The model will be downloaded from Hugging Face on the first run
uvicorn app.main:app --host 0.0.0.0 --port 7860 --reload
```

The API will now be running at `http://localhost:7860`.

### 3\. Set Up the Frontend Web App

```bash
# Navigate to the web app directory
cd apps/web

# Install Node.js dependencies
npm install

# Create an environment file
cp .env.development .env.local

# Make sure VITE_API_URL in .env.local points to your local API server
# VITE_API_URL=http://localhost:7860

# Start the development server
npm run dev
```

The React application will be available at `http://localhost:5173`.

### 4\. Running the ML Pipeline

The machine learning pipeline has its own detailed instructions for training and evaluation. Please refer to its dedicated guide:

➡️ **[ML Pipeline README](https://www.google.com/search?q=./ml/README.md)**

-----

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.