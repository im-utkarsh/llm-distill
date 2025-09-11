# 📟 LLM Distillation - Web Interface

This directory contains the frontend application for the LLM Distillation project. It's a modern React application built with Vite and styled with Tailwind CSS to provide an interactive, real-time chat experience with the distilled model API.

A key feature of this interface is its unique **retro CRT terminal aesthetic**, designed to be both functional and visually engaging.

For an overview of the entire monorepo and project, please refer to the [**root README.md**](../../README.md).

---

## 🚀 Live Demo

You can interact with the live deployment here: **[llm-distill-ui.onrender.com](https://llm-distill-ui.onrender.com/)**

---

## ✨ Features

-   **Real-Time Streaming:** Renders the LLM's responses token-by-token as they are streamed from the backend's SSE endpoint.
-   **Retro CRT Aesthetic:** A heavily customized UI featuring a terminal font (VT323), scan lines, flicker animations, glowing text, and an animated starfield background for a nostalgic feel.
-   **Persistent Chat History:** Conversations are automatically saved to the browser's `localStorage`, allowing users to close the tab and resume their sessions later.
-   **Clean State Management:** Utilizes React's `Context` API and `useReducer` hook (`ChatProvider`) for predictable and centralized application state management.
-   **Efficient Tooling:** Built with Vite for a lightning-fast development server, hot module replacement (HMR), and optimized production builds.
-   **Custom Hooks:** Encapsulates complex logic for SSE streaming (`useSseStream`), local storage persistence (`useLocalStorage`), and other functionalities.
-   **Responsive Design:** The UI is functional on both desktop and mobile devices, with a collapsible sidebar for managing chat sessions on smaller screens.

---

## 🛠️ Local Development Setup

### Prerequisites

-   Node.js 18+
-   `npm` (or a compatible package manager like `yarn` or `pnpm`)

### Installation and Running

1.  **Navigate to the web directory:**
    ```bash
    cd apps/web
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    The application needs to know the URL of the backend API.
    ```bash
    # Copy the example environment file
    cp .env.development .env.local
    ```
    Now, open the newly created `.env.local` file and ensure the `VITE_API_URL` points to your locally running API instance (from the `apps/api` service).
    ```env
    # .env.local
    VITE_API_URL=http://localhost:7860
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

The application will now be running on `http://localhost:5173` and will automatically reload when you make changes to the source code.

---

## 📜 Available Scripts

The following scripts are available in the `package.json`:

| Command           | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Starts the Vite development server with hot-reloading.         |
| `npm run build`   | Compiles and bundles the application for production.           |
| `npm run lint`    | Runs ESLint to analyze the code for potential errors.          |
| `npm run preview` | Serves the production build locally to test before deployment. |

---

## 🏗️ Architectural Overview

The frontend is structured to be scalable and maintainable.

-   **State Management (`src/providers/`)**: Global state is managed via `ChatProvider.tsx`, which uses a `useReducer` hook with logic defined in `chatReducer.ts`. This provides a single source of truth for all chat sessions and messages.
-   **Component Structure (`src/features/`)**: The UI is organized by features. For example, `features/chat-list` contains the components for the sidebar, while `features/chat-view` contains the components for the main conversation area.
-   **Streaming Logic (`src/hooks/useSseStream.ts`)**: This custom hook is the heart of the real-time functionality. It abstracts all the complexity of creating an `EventSource`, connecting to the SSE endpoint, listening for messages, handling errors, and dispatching state updates.
-   **Styling (`tailwind.config.js`, `src/index.css`)**: The application is styled using Tailwind CSS. The unique CRT theme, including custom colors (`crt-bg`, `crt-orange`), fonts (`VT323`), and animations (`flicker`, `blink`), is defined in `tailwind.config.js`. Additional global styles and complex animations like the starfield are in `src/index.css`.

---

## 📂 Directory Structure

````

web/
└── src/
├── components/         \# Global, reusable components (e.g., Starfield)
├── features/           \# Feature-specific components (e.g., ChatView, ChatList)
│   ├── chat-list/
│   └── chat-view/
├── hooks/              \# Custom React hooks (e.g., useSseStream)
├── lib/                \# Utility functions (e.g., cn for classnames)
├── providers/          \# React Context providers for state management
│   ├── ChatProvider.tsx
│   └── chatReducer.ts
├── types/              \# TypeScript type definitions
├── App.tsx             \# Main application component and layout
└── main.tsx            \# Application entry point
