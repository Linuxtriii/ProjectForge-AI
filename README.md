# ProjectForge AI

ProjectForge AI turns a student's skills, career goals, and target role into technically serious software project ideas that are strong enough to build and discuss in interviews.

It is local-first: the API checks Ollama first, automatically selects an installed preferred model, and falls back to a deterministic project generator when local AI is unavailable. No OpenAI API is used and no API key is required for the core app.

## Features

- Profile form for education, skills, experience, goals, target roles, and preferred technologies
- Ollama model discovery through the backend
- Automatic preference order: `qwen3:8b`, `llama3.1:8b`, `mistral:7b`, then another installed model
- Structured JSON generation with validation and safe JSON extraction
- Deterministic fallback engine that remains useful without Ollama
- Project cards with resume value, technical depth, uniqueness, and role-fit scores
- Detailed project briefs with architecture, stack, features, AI usage, resume bullets, and interview questions
- Client-side search, category filtering, and sorting
- Saved project bench stored in localStorage
- Clipboard actions for project ideas, resume bullets, and tech stacks
- Regenerate-a-variation flow for making a project more advanced, more beginner-friendly, or more placement-focused
- Responsive layout for desktop, tablet, and mobile

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