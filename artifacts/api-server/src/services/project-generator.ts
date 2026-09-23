import { GenerateProjectsResponse, type GenerateInput, type Project } from "@workspace/api-zod";

const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const PREFERRED_MODELS = [
  process.env.DEFAULT_OLLAMA_MODEL ?? "qwen3:8b",
  "llama3.1:8b",
  "mistral:7b",
];

type OllamaTagResponse = {
  models?: Array<{ name?: string }>;
};

type OllamaGenerateResponse = {
  response?: string;
};

type GeneratorResult = {
  source: "ollama" | "fallback";
  model: string | null;
  projects: Project[];
  message?: string | null;
};

export type AiSnapshot = {
  provider: "ollama" | "fallback";
  available: boolean;
  model: string | null;
  installed: boolean;
  message: string;
  models: string[];
};

const cleanModelName = (name: string) => name.trim().toLowerCase();

async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs = 4000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function listOllamaModels(): Promise<string[]> {
  try {
    const response = await fetchWithTimeout(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) return [];
    const data = (await response.json()) as OllamaTagResponse;
    return (data.models ?? [])
      .map((model) => model.name)
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function selectOllamaModel(models: string[], requested?: string | null): string | null {
  const normalized = new Map(models.map((model) => [cleanModelName(model), model]));
  if (requested && normalized.has(cleanModelName(requested))) {
    return normalized.get(cleanModelName(requested)) ?? null;
  }
  for (const preferred of PREFERRED_MODELS) {
    const match = normalized.get(preferred);
    if (match) return match;
  }
  return models[0] ?? null;
}

export async function getAiSnapshot(requested?: string | null): Promise<AiSnapshot> {
  const models = await listOllamaModels();
  const model = selectOllamaModel(models, requested);
  if (model) {
    return {
      provider: "ollama",
      available: true,
      model,
      installed: true,
      message: "Ollama is connected and ready for local generation.",
      models,
    };
  }
  const installed = await isOllamaReachable();
  return {
    provider: "fallback",
    available: false,
    model: null,
    installed,
    message: installed
      ? "Ollama is running, but no local models were found. The built-in generator is active."
      : "Local AI is unavailable. The built-in generator is active so you can keep going.",
    models,
  };
}

async function isOllamaReachable(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${OLLAMA_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
}

function buildPrompt(input: GenerateInput): string {
  const { profile, preferences } = input;
  const variation = input.variationRequest
    ? `\nVariation request: ${input.variationRequest}\nBase project to vary: ${JSON.stringify(input.variationProject ?? {})}`
    : "";
  return `You are a senior software engineer, startup advisor, technical recruiter, and engineering mentor.

Design ${preferences.count} unique, technically deep, realistic software projects for a student or early-career developer. Prioritize real-world problems, meaningful engineering complexity, strong architecture, practical implementation, interview discussion value, resume impact, and current industry relevance. Match every project to the user's actual skills and target career. Do not generate generic todo, calculator, weather, blog, notes, expense, library management, basic CRUD, basic portfolio, generic ecommerce, or simple chat projects. Do not add AI unnecessarily.

Return ONLY valid JSON: an object with source, model, projects, and message fields. The projects array must contain objects with this exact shape:
title, oneLinePitch, problem, solution, targetUsers, category, difficulty, resumeValue, technicalDepth, uniqueness, placementRelevance, techStack (frontend, backend, database, ai, other), coreFeatures, advancedFeatures, architecture, aiUsage, apis, databaseDesign, learningOutcomes, resumeBulletPoints, interviewQuestions, estimatedBuildTime, monetizationPotential.
Use integer scores from 1 to 10 and concise but specific strings. Use empty arrays when a list does not apply.

Candidate profile:
${JSON.stringify({ profile, preferences })}
${variation}`;
}

function extractJson(text: string): unknown {
  const withoutFence = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(withoutFence);
  } catch {
    const objectStart = withoutFence.indexOf("{");
    const objectEnd = withoutFence.lastIndexOf("}");
    if (objectStart < 0 || objectEnd <= objectStart) return null;
    try {
      return JSON.parse(withoutFence.slice(objectStart, objectEnd + 1));
    } catch {
      return null;
    }
  }
}

function normalizeProjects(payload: unknown): Project[] {
  const parsed = GenerateProjectsResponse.safeParse({
    source: "ollama",
    model: null,
    projects:
      payload && typeof payload === "object" && "projects" in payload
        ? (payload as { projects?: unknown }).projects
        : payload,
  });
  if (!parsed.success) return [];
  return parsed.data.projects;
}

async function generateWithOllama(input: GenerateInput, model: string): Promise<Project[]> {
  const response = await fetchWithTimeout(
    `${OLLAMA_URL}/api/generate`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: buildPrompt(input),
        stream: false,
        format: "json",
        options: { temperature: 0.7 },
      }),
    },
    90000,
  );
  if (!response.ok) return [];
  const data = (await response.json()) as OllamaGenerateResponse;
  return normalizeProjects(extractJson(data.response ?? ""));
}

export async function generateProjects(input: GenerateInput): Promise<GeneratorResult> {
  const snapshot = await getAiSnapshot(input.model);
  if (snapshot.model) {
    try {
      const projects = await generateWithOllama(input, snapshot.model);
      if (projects.length > 0) {
        return { source: "ollama", model: snapshot.model, projects };
      }
    } catch {
      // The route will use the deterministic generator below.
    }
  }
  const fallback = createFallbackProjects(input);
  return {
    source: "fallback",
    model: null,
    projects: fallback,
    message: snapshot.message,
  };
}

export function createFallbackProjects(input: GenerateInput): Project[] {
  const { profile, preferences } = input;
  const skills = profile.skills.length ? profile.skills : ["TypeScript", "React", "Node.js"];
  const preferred = preferences.preferredTechnologies?.filter(Boolean) ?? [];
  const stack = [...new Set([...skills, ...preferred])];
  const frontend = stack.filter((skill) => /react|vue|angular|frontend|typescript|next/i.test(skill)).slice(0, 3);
  const backend = stack.filter((skill) => /node|python|java|spring|go|backend|express|django/i.test(skill)).slice(0, 3);
  const database = stack.filter((skill) => /sql|postgres|mongo|redis|database|firebase/i.test(skill)).slice(0, 2);
  const ai = stack.filter((skill) => /ai|ml|llm|python|rag|model/i.test(skill)).slice(0, 2);
  const safeFrontend = frontend.length ? frontend : ["React", "TypeScript"];
  const safeBackend = backend.length ? backend : ["Node.js", "Express"];
  const safeDatabase = database.length ? database : ["PostgreSQL"];
  const safeAi = ai.length ? ai : preferences.category.toLowerCase().includes("ai") ? ["Ollama", "RAG"] : [];
  const category = !preferences.category || preferences.category === "Any category" ? "Developer tools" : preferences.category;
  const role = profile.targetRole || "software engineering";
  const difficulty = !preferences.difficulty || preferences.difficulty === "Any difficulty" ? "Intermediate" : preferences.difficulty;
  const goal = profile.careerGoal || "off-campus placement";
  const templates = [
    {
      title: `${role} Signal Lab`,
      pitch: `A portfolio intelligence workspace that turns messy evidence into a clear growth plan for ${goal}.`,
      problem: "Students collect projects, feedback, and job requirements across disconnected documents but cannot see which engineering signals are missing.",
      solution: "Ingest project notes and job descriptions, normalize them into a skill graph, and surface evidence-backed next projects with measurable outcomes.",
      core: ["Job description parsing and skill taxonomy", "Project evidence timeline", "Gap analysis with explainable recommendations"],
      advanced: ["Streaming document ingestion", "Semantic search over project artifacts", "Experiment tracking for recommendation quality"],
      aiUsage: safeAi.length ? "Use local embeddings and an Ollama model to extract skills, cluster evidence, and explain gaps without exposing private documents." : "Use deterministic rules to map project evidence to a role-specific skill taxonomy; AI can be added later for semantic extraction.",
    },
    {
      title: `${category} Workflow Observatory`,
      pitch: `A developer tool that shows where real workflows stall and suggests interventions before users abandon them.`,
      problem: "Small teams instrument product events but struggle to connect failures, latency, and user intent into one actionable view.",
      solution: "Collect typed workflow events, reconstruct sessions, and rank the highest-impact bottlenecks with traceable evidence.",
      core: ["Event ingestion API with idempotency", "Workflow replay and bottleneck view", "Role-specific operational dashboards"],
      advanced: ["Rule-based anomaly detection", "Replayable event streams", "Alert routing with escalation policies"],
      aiUsage: safeAi.length ? "Use local AI to summarize incident clusters and draft evidence-linked remediation notes while keeping raw event data local." : "Start with statistical summaries and rule-based anomaly detection; the architecture leaves a clear seam for local AI summaries.",
    },
    {
      title: `${role} Practice Engine`,
      pitch: `A project-based interview practice system that adapts challenges to the engineering work a candidate wants to discuss.`,
      problem: "Interview prep is usually generic, so candidates memorize answers without understanding the tradeoffs behind their own projects.",
      solution: "Generate scenario prompts from a candidate's project architecture, score reasoning against a rubric, and create targeted follow-ups.",
      core: ["Architecture-to-question generator", "Rubric-based answer review", "Progress map by competency"],
      advanced: ["Adversarial follow-up mode", "Replayable interview sessions", "Calibration dashboard for rubric quality"],
      aiUsage: safeAi.length ? "Use Ollama to create role-specific follow-ups and critique reasoning against a structured rubric; keep scoring criteria deterministic." : "Use curated question templates and deterministic rubric scoring so practice works offline.",
    },
    {
      title: `${category} Knowledge Relay`,
      pitch: `A focused retrieval system that helps teams turn technical decisions into reusable, searchable learning paths.`,
      problem: "Important engineering context is buried in tickets and documents, leaving new contributors to rediscover decisions.",
      solution: "Capture decisions as linked knowledge units, retrieve relevant context by task, and show the confidence and source behind each answer.",
      core: ["Decision record capture", "Source-linked retrieval", "Contributor onboarding paths"],
      advanced: ["Hybrid keyword and vector search", "Contradiction detection", "Access-aware knowledge graphs"],
      aiUsage: safeAi.length ? "Use local embeddings and Ollama for retrieval synthesis, always citing the underlying decision records." : "Use weighted keyword search and explicit source links first, with local AI available as an optional upgrade.",
    },
  ];

  return templates.slice(0, preferences.count).map((template, index) => {
    const id = `fallback-${Date.now()}-${index}`;
    return {
      id,
      title: template.title,
      oneLinePitch: template.pitch,
      problem: template.problem,
      solution: template.solution,
      targetUsers: ["Students", "Early-career developers", "Hiring teams"],
      category,
      difficulty,
      resumeValue: Math.min(10, 8 + (index % 3)),
      technicalDepth: Math.min(10, 8 + ((index + 1) % 3)),
      uniqueness: Math.min(10, 8 + ((index + 2) % 3)),
      placementRelevance: 9,
      techStack: {
        frontend: safeFrontend,
        backend: safeBackend,
        database: safeDatabase,
        ai: safeAi,
        other: ["Docker", "REST APIs"],
      },
      coreFeatures: template.core,
      advancedFeatures: template.advanced,
      architecture: `A responsive ${safeFrontend.join(" + ")} client sends typed requests to a ${safeBackend.join(" + ")} API. Domain services handle ${category.toLowerCase()} logic, persist structured records in ${safeDatabase.join(" + ")}, and connect to external services only through validated adapters.`,
      aiUsage: template.aiUsage,
      apis: ["REST API", "OpenAPI contract", "Optional local Ollama API"],
      databaseDesign: ["users", "projects", "skill_signals", "workflow_events", "evaluation_runs"],
      learningOutcomes: ["API design", "Data modeling", "Observability", "Testing tradeoffs", "Interview communication"],
      resumeBulletPoints: [
        `Built a ${difficulty.toLowerCase()} ${category.toLowerCase()} platform with typed ${safeBackend.join(" and ")} APIs and a responsive ${safeFrontend.join(" and ")} client.`,
        `Designed explainable workflows that connect user evidence to measurable engineering outcomes for ${goal}.`,
        `Implemented resilient local-first processing with validated data boundaries and a clear path to production scale.`,
      ],
      interviewQuestions: [
        "How would you keep the recommendation or retrieval results explainable?",
        "Where would you add caching, and how would you invalidate it safely?",
        "What failure modes would you test before shipping this to real users?",
      ],
      estimatedBuildTime: difficulty.toLowerCase() === "advanced" ? "3–5 weeks" : "2–4 weeks",
      monetizationPotential: "Offer a free personal workspace and a team plan with collaboration, private workspaces, and analytics.",
    };
  });
}