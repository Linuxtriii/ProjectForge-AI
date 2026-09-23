# ProjectForge AI

> A local-first AI project generator that turns a student's skills, career goals, target role, and preferred technologies into technically strong software project ideas.

ProjectForge AI helps students move from **"What should I build?"** to a concrete, interview-ready project plan.

The application uses a local Ollama model when available and automatically falls back to a deterministic generation engine when local AI is unavailable. No OpenAI API key is required.

## ✨ Features

- 🎯 Student profile input for education, skills, experience, goals, target roles, and technologies
- 🤖 Local AI generation using Ollama
- 🔎 Automatic detection of installed Ollama models
- 🧠 Preferred model selection:
  - `qwen3:8b`
  - `llama3.1:8b`
  - `mistral:7b`
  - Any other installed model as fallback
- 🛡️ Structured JSON generation with validation and safe JSON extraction
- 🔄 Deterministic fallback generation when Ollama is unavailable
- 📊 Project scoring based on:
  - Resume value
  - Technical depth
  - Uniqueness
  - Role fit
- 📋 Detailed project briefs containing:
  - Architecture
  - Technology stack
  - Features
  - AI usage
  - Resume bullet points
  - Interview questions
- 🔍 Client-side search, filtering, and sorting
- 💾 Saved project bench using browser `localStorage`
- 📋 One-click clipboard actions for project ideas, resume bullets, and tech stacks
- 🔁 Project variation generation
- 📱 Responsive interface for desktop, tablet, and mobile

## 🏗️ Architecture

```text
┌──────────────────────────────┐
│      React + TypeScript      │
│     TanStack Query + Vite    │
└──────────────┬───────────────┘
               │
               │ HTTP
               ▼
┌──────────────────────────────┐
│       Express 5 API          │
│        /api/* routes         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       AI Generation          │
│                              │
│  Ollama → Local LLM          │
│          │                   │
│          └── unavailable ──┐ │
│                            ▼ │
│                  Deterministic│
│                  Fallback     │
└──────────────────────────────┘
## Tech stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, TanStack Query, Wouter
- Backend: Express 5, TypeScript
- Contract: OpenAPI 3.1 with generated React Query hooks and Zod schemas
- Local AI: Ollama HTTP API
- Persistence: browser localStorage for saved projects

## Running locally

Install dependencies with pnpm:

```bash
pnpm install
```

Start the API server and frontend using the configured workflows, or run the package commands in separate terminals:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/projectforge-ai run dev
```

The frontend talks to the API through the `/api` path. The managed workflows provide the required `PORT` and `BASE_PATH` values.

## Ollama setup

1. Install Ollama from [ollama.com](https://ollama.com).
2. Start the Ollama app or service.
3. Download a preferred local model:

```bash
ollama pull qwen3:8b
```

4. Confirm installed models:

```bash
ollama list
```

5. Start the ProjectForge AI workflows and refresh the app.

ProjectForge calls Ollama through the Express server; the browser never connects to Ollama directly. If Ollama is stopped or no models are installed, the app clearly switches to the built-in fallback engine.

## Architecture

```text
React + TanStack Query
        ↓
Express API at /api
        ↓
OllamaProvider → http://localhost:11434
        ↓
Validated structured project JSON
        ↘
  Deterministic fallback engine
```

The OpenAPI contract lives in `lib/api-spec/openapi.yaml`. Regenerate the typed client and server schemas after changing it:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## API endpoints

- `GET /api/healthz` — server health
- `GET /api/ai/status` — Ollama availability and selected model
- `GET /api/ai/models` — installed model names
- `POST /api/generate` — Ollama-first generation with fallback recovery
- `POST /api/fallback/generate` — deterministic fallback generation

## Environment variables

Copy `.env.example` when running outside the managed Replit workflows:

- `OLLAMA_BASE_URL` — Ollama server URL, default `http://localhost:11434`
- `DEFAULT_OLLAMA_MODEL` — documented preferred model; automatic selection still checks the installed model list
- `HF_API_KEY` — reserved for a future optional provider, not required
- `GROQ_API_KEY` — reserved for a future optional provider, not required

## Quality checks

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/projectforge-ai run build
```
