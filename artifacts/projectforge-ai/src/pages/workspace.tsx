import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  CircleHelp,
  Clock3,
  Code2,
  Copy,
  Cpu,
  Database,
  Filter,
  Layers3,
  Loader2,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import {
  getGetAiModelsQueryKey,
  getGetAiStatusQueryKey,
  getHealthCheckQueryKey,
  useGenerateFallbackProjects,
  useGenerateProjects,
  useGetAiModels,
  useGetAiStatus,
  useHealthCheck,
  type GenerateInput,
  type Project,
  type Profile,
} from "@workspace/api-client-react";

type SavedProject = Project & { savedAt: string };
type SortMode = "fit" | "depth" | "recent";

const SKILL_SUGGESTIONS = ["TypeScript", "React", "Python", "PostgreSQL", "Node.js", "Docker", "AWS", "LLM APIs"];
const CATEGORIES = ["Any category", "Web platform", "Developer tools", "Data & AI", "Mobile", "Systems", "Climate & civic"];
const DIFFICULTIES = ["Any difficulty", "Starter", "Intermediate", "Advanced"];
const initialProfile: Profile = {
  degree: "",
  branch: "",
  year: "",
  university: "",
  skills: [],
  targetRole: "",
  targetCompany: "",
  careerGoal: "",
  experienceLevel: "Early-career",
  existingProjects: "",
  internshipExperience: "",
  learningAreas: "",
};

const initialPreferences = {
  category: "Any category",
  difficulty: "Any difficulty",
  count: 3,
  preferredTechnologies: [] as string[],
};

const exampleProfile: Profile = {
  degree: "B.Tech",
  branch: "Computer Science",
  year: "4th year",
  university: "Example Institute",
  skills: ["Python", "React", "TypeScript", "SQL", "Machine Learning"],
  targetRole: "Software Developer",
  targetCompany: "Product engineering teams",
  careerGoal: "Build a standout portfolio for off-campus placements",
  experienceLevel: "Early-career",
  existingProjects: "",
  internshipExperience: "",
  learningAreas: "Distributed systems and applied AI",
};

const examplePreferences = {
  category: "Data & AI",
  difficulty: "Advanced",
  count: 3,
  preferredTechnologies: ["PostgreSQL", "Docker"],
};

function readSavedProjects(): SavedProject[] {
  try {
    return JSON.parse(localStorage.getItem("projectforge:saved") || "[]") as SavedProject[];
  } catch {
    return [];
  }
}

function MetricBar({ label, value, tone = "teal" }: { label: string; value: number; tone?: "teal" | "coral" | "gold" }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        <span>{label}</span><span className="font-mono-ui text-foreground">{value}/10</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${tone === "coral" ? "bg-accent" : tone === "gold" ? "bg-[#d69b23]" : "bg-primary"}`}
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

function Tag({ children, soft = false }: { children: ReactNode; soft?: boolean }) {
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold ${soft ? "border-border bg-muted/60 text-muted-foreground" : "border-primary/20 bg-primary/8 text-primary"}`}>{children}</span>;
}

function ProjectCard({ project, saved, onSave, onInspect }: { project: Project; saved: boolean; onSave: () => void; onInspect: () => void }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div className="absolute left-0 top-0 h-full w-1 bg-primary opacity-60 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Tag>{project.category}</Tag>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{project.difficulty}</span>
        </div>
        <button
          type="button"
          onClick={onSave}
          data-testid={`button-save-project-${project.id}`}
          aria-label={saved ? `Remove ${project.title} from saved projects` : `Save ${project.title}`}
          className={`rounded-lg p-2 transition-colors ${saved ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
        </button>
      </div>
      <h3 className="mt-4 font-display text-xl font-semibold leading-tight tracking-[-0.03em] text-foreground">{project.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.oneLinePitch}</p>
      <div className="mt-5 grid grid-cols-3 gap-3 border-y border-border/70 py-4">
        <MetricBar label="Resume" value={project.resumeValue} />
        <MetricBar label="Depth" value={project.technicalDepth} tone="coral" />
        <MetricBar label="Fit" value={project.placementRelevance} tone="gold" />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {[...project.techStack.frontend, ...project.techStack.backend, ...project.techStack.ai].slice(0, 5).map((tech) => <Tag key={tech} soft>{tech}</Tag>)}
      </div>
      <button type="button" onClick={onInspect} data-testid={`button-inspect-project-${project.id}`} className="mt-5 flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3 text-left text-sm font-semibold text-secondary-foreground transition-transform duration-200 hover:translate-x-0.5">
        Inspect project brief <ArrowRight size={16} />
      </button>
    </article>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1, 2].map((item) => <div key={item} className="h-[328px] animate-pulse rounded-2xl border border-border bg-card/70 p-5">
        <div className="h-5 w-28 rounded bg-muted" /><div className="mt-6 h-7 w-4/5 rounded bg-muted" /><div className="mt-3 h-4 w-full rounded bg-muted" /><div className="mt-2 h-4 w-3/5 rounded bg-muted" /><div className="mt-8 h-10 rounded bg-muted" /><div className="mt-6 h-10 rounded bg-muted" />
      </div>)}
    </div>
  );
}

function EmptyWorkspace({ onGenerate, hasProfile }: { onGenerate: () => void; hasProfile: boolean }) {
  return (
    <div className="panel-grid relative overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-primary/[0.035] px-6 py-16 text-center sm:px-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Code2 size={30} /></div>
      <p className="mt-6 font-mono-ui text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Workspace standing by</p>
      <h2 className="mx-auto mt-3 max-w-lg font-display text-3xl font-semibold tracking-[-0.04em]">Turn your profile into work worth talking about.</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">{hasProfile ? "Your profile is ready. Generate a focused set of project briefs calibrated to your next role." : "Start with the profile on the left. ProjectForge will turn your context into buildable, interview-ready project briefs."}</p>
      <button type="button" onClick={onGenerate} data-testid="button-empty-generate" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground transition-transform hover:-translate-y-0.5"><Sparkles size={16} /> Generate project briefs</button>
      <div className="mx-auto mt-10 flex max-w-lg items-center justify-center gap-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
        <span className="flex items-center gap-1.5"><Target size={14} /> Role-aware</span><span className="h-1 w-1 rounded-full bg-border" /><span className="flex items-center gap-1.5"><Layers3 size={14} /> Technical depth</span><span className="h-1 w-1 rounded-full bg-border" /><span className="flex items-center gap-1.5"><Zap size={14} /> Resume-ready</span>
      </div>
    </div>
  );
}

function ProjectDrawer({ project, saved, onClose, onSave, onRegenerate, regenerating }: { project: Project; saved: boolean; onClose: () => void; onSave: () => void; onRegenerate: (request: string) => void; regenerating: boolean }) {
  const [copied, setCopied] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState("");
  const [variationRequest, setVariationRequest] = useState("Make this more suitable for software engineering placements");
  const copyBullet = async () => {
    await navigator.clipboard?.writeText(project.resumeBulletPoints.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const copyContent = async (label: string, content: string) => {
    await navigator.clipboard?.writeText(content);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(""), 1800);
  };
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-secondary/30 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${project.title} project brief`}>
      <button type="button" onClick={onClose} data-testid="button-close-drawer-overlay" className="absolute inset-0 cursor-default" aria-label="Close project details" />
      <aside className="relative z-10 h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-2 font-mono-ui text-[11px] uppercase tracking-[0.14em] text-primary"><span className="h-2 w-2 rounded-full bg-primary" /> Project brief</div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onSave} data-testid="button-drawer-save" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">{saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button>
            <button type="button" onClick={onClose} data-testid="button-close-drawer" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={19} /></button>
          </div>
        </div>
        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap gap-2"><Tag>{project.category}</Tag><Tag soft>{project.difficulty}</Tag><Tag soft><Clock3 size={12} className="mr-1" /> {project.estimatedBuildTime}</Tag></div>
          <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.04] tracking-[-0.05em]">{project.title}</h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">{project.oneLinePitch}</p>
          <div className="mt-7 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3">
            <div className="rounded-xl bg-primary/8 p-3"><div className="font-mono-ui text-2xl font-medium text-primary">{project.resumeValue}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Resume value</div></div>
            <div className="rounded-xl bg-accent/10 p-3"><div className="font-mono-ui text-2xl font-medium text-accent">{project.technicalDepth}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Depth</div></div>
            <div className="rounded-xl bg-[#d69b23]/10 p-3"><div className="font-mono-ui text-2xl font-medium text-[#9b6d0d]">{project.placementRelevance}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Role fit</div></div>
          </div>
          <section className="mt-9 space-y-7">
            <div><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><span className="text-primary">01</span> The opening</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Problem</p><p className="mt-2 text-sm leading-6">{project.problem}</p></div><div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Solution</p><p className="mt-2 text-sm leading-6">{project.solution}</p></div></div></div>
            <div><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><span className="text-primary">02</span> System shape</h3><p className="mt-3 rounded-xl bg-secondary p-4 font-mono-ui text-xs leading-6 text-secondary-foreground">{project.architecture}</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-border p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground"><Network size={13} /> Tech stack</p><div className="mt-3 flex flex-wrap gap-1.5">{Object.values(project.techStack).flat().map((tech) => <Tag key={tech} soft>{tech}</Tag>)}</div></div><div className="rounded-xl border border-border p-4"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground"><Cpu size={13} /> AI usage</p><p className="mt-2 text-sm leading-6">{project.aiUsage || "Use AI only where it makes the product more capable, not more decorative."}</p></div></div></div>
            <div><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><span className="text-primary">03</span> Build sequence</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{project.coreFeatures.map((feature, index) => <div key={feature} className="flex gap-3 rounded-xl border border-border bg-card p-3 text-sm"><span className="font-mono-ui text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>{feature}</div>)}</div><div className="mt-3 rounded-xl border border-dashed border-primary/30 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">Stretch direction</p><p className="mt-2 text-sm leading-6">{project.advancedFeatures.join(" · ")}</p></div></div>
            <div><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><span className="text-primary">04</span> Your resume angle</h3><div className="mt-3 rounded-xl border border-accent/30 bg-accent/8 p-4">{project.resumeBulletPoints.map((bullet) => <p key={bullet} className="flex gap-2 text-sm leading-6"><span className="text-accent">—</span>{bullet}</p>)}<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={copyBullet} data-testid="button-copy-resume-bullets" className="inline-flex items-center gap-2 rounded-lg border border-accent/30 px-3 py-2 text-xs font-bold text-accent transition-colors hover:bg-accent/10">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy bullets"}</button><button type="button" onClick={() => copyContent("idea", `${project.title}\n\n${project.oneLinePitch}\n\nProblem: ${project.problem}\n\nSolution: ${project.solution}`)} data-testid="button-copy-project-idea" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Copy size={14} />{copiedLabel === "idea" ? "Copied idea" : "Copy project idea"}</button><button type="button" onClick={() => copyContent("stack", Object.values(project.techStack).flat().join(" • "))} data-testid="button-copy-tech-stack" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Copy size={14} />{copiedLabel === "stack" ? "Copied stack" : "Copy tech stack"}</button></div></div></div>
            <div><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><span className="text-primary">05</span> Interview pressure test</h3><div className="mt-3 space-y-2">{project.interviewQuestions.map((question) => <div key={question} className="flex gap-3 rounded-xl border border-border p-3 text-sm leading-6"><CircleHelp size={16} className="mt-0.5 shrink-0 text-primary" />{question}</div>)}</div></div>
            <div><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><span className="text-primary">06</span> Refine this direction</h3><div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.035] p-4"><p className="text-sm leading-6 text-muted-foreground">Ask for a sharper version without losing the original project context.</p><textarea value={variationRequest} onChange={(event) => setVariationRequest(event.target.value)} rows={2} data-testid="input-regenerate-request" className="mt-3" /><button type="button" onClick={() => onRegenerate(variationRequest)} disabled={regenerating || !variationRequest.trim()} data-testid="button-regenerate-project" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{regenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}{regenerating ? "Regenerating..." : "Regenerate variation"}</button></div></div>
          </section>
        </div>
      </aside>
    </div>
  );
}

export default function Workspace() {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [skillInput, setSkillInput] = useState("");
  const [techInput, setTechInput] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("fit");
  const [showSaved, setShowSaved] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showAiHelp, setShowAiHelp] = useState(false);

  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 30_000 } });
  const aiStatus = useGetAiStatus({ query: { queryKey: getGetAiStatusQueryKey(), staleTime: 30_000 } });
  const aiModels = useGetAiModels({ query: { queryKey: getGetAiModelsQueryKey(), staleTime: 30_000 } });
  const generate = useGenerateProjects();
  const fallbackGenerate = useGenerateFallbackProjects();
  const isGenerating = generate.isPending || fallbackGenerate.isPending;

  useEffect(() => setSavedProjects(readSavedProjects()), []);
  useEffect(() => { localStorage.setItem("projectforge:saved", JSON.stringify(savedProjects)); }, [savedProjects]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const profileReady = Boolean(profile.targetRole.trim() && profile.careerGoal.trim() && profile.skills.length);
  const categories = useMemo(() => ["All", ...Array.from(new Set(projects.map((project) => project.category)))], [projects]);
  const visibleProjects = useMemo(() => {
    const source = showSaved ? savedProjects : projects;
    const filtered = source.filter((project) => {
      const matchesQuery = !query || `${project.title} ${project.oneLinePitch} ${project.category}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = activeCategory === "All" || project.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
    return [...filtered].sort((a, b) => sortMode === "depth" ? b.technicalDepth - a.technicalDepth : sortMode === "recent" ? (b as SavedProject).savedAt?.localeCompare((a as SavedProject).savedAt || "") || 0 : b.placementRelevance - a.placementRelevance);
  }, [activeCategory, projects, query, savedProjects, showSaved, sortMode]);

  const updateProfile = (field: keyof Profile, value: string) => setProfile((current) => ({ ...current, [field]: value }));
  const addToken = (kind: "skills" | "preferredTechnologies", value: string) => {
    const token = value.trim().replace(/,$/, "");
    if (!token) return;
    setProfile((current) => kind === "skills" ? { ...current, skills: Array.from(new Set([...current.skills, token])) } : current);
    if (kind === "preferredTechnologies") setPreferences((current) => ({ ...current, preferredTechnologies: Array.from(new Set([...current.preferredTechnologies, token])) }));
  };
  const removeToken = (kind: "skills" | "preferredTechnologies", token: string) => {
    if (kind === "skills") setProfile((current) => ({ ...current, skills: current.skills.filter((item) => item !== token) }));
    else setPreferences((current) => ({ ...current, preferredTechnologies: current.preferredTechnologies.filter((item) => item !== token) }));
  };
  const toggleSaved = (project: Project) => {
    setSavedProjects((current) => current.some((item) => item.id === project.id) ? current.filter((item) => item.id !== project.id) : [...current, { ...project, savedAt: new Date().toISOString() }]);
    setNotice(savedProjects.some((item) => item.id === project.id) ? "Removed from your saved bench" : "Saved to your project bench");
  };
  const buildPayload = (): GenerateInput => ({ profile, preferences, model: selectedModel || aiModels.data?.selected || null, variationProject: null, variationRequest: null });
  const handleExploreExamples = () => {
    setProfile(exampleProfile);
    setPreferences(examplePreferences);
    setShowSaved(false);
    setNotice("Example profile loaded. Generate when you are ready to make it yours.");
    setSidebarOpen(true);
  };
  const handleGenerate = () => {
    setErrorMessage("");
    if (!profileReady) { setSidebarOpen(true); setErrorMessage("Add a target role, career goal, and at least one skill before generating."); return; }
    const payload = buildPayload();
    generate.mutate({ data: payload }, {
      onSuccess: (result) => { setProjects(result.projects); setShowSaved(false); setNotice(`${result.projects.length} briefs assembled · ${result.source === "ollama" ? "local model" : "fallback engine"}`); },
      onError: () => fallbackGenerate.mutate({ data: payload }, {
        onSuccess: (result) => { setProjects(result.projects); setShowSaved(false); setNotice(`${result.projects.length} briefs assembled · fallback engine`); },
        onError: () => setErrorMessage("The project engine could not respond. Check the server connection and try again."),
      }),
    });
  };
  const handleRegenerate = (project: Project, request: string) => {
    setErrorMessage("");
    const payload: GenerateInput = { ...buildPayload(), variationProject: { ...project } as Record<string, unknown>, variationRequest: request };
    generate.mutate({ data: payload }, {
      onSuccess: (result) => { setProjects(result.projects); setSelectedProject(null); setNotice(`${result.projects.length} refreshed brief${result.projects.length === 1 ? "" : "s"} assembled`); },
      onError: () => fallbackGenerate.mutate({ data: payload }, {
        onSuccess: (result) => { setProjects(result.projects); setSelectedProject(null); setNotice(`${result.projects.length} refreshed brief${result.projects.length === 1 ? "" : "s"} assembled · fallback engine`); },
        onError: () => setErrorMessage("The variation engine could not respond. Try again in a moment."),
      }),
    });
  };

  return (
    <div className="app-noise min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-border bg-background/92 px-4 backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setSidebarOpen((value) => !value)} data-testid="button-toggle-sidebar" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden">{sidebarOpen ? <PanelLeftClose size={19} /> : <Menu size={19} />}</button>
          <div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-secondary text-primary"><span className="font-mono-ui text-sm font-medium">&gt;_</span></div><div><div className="font-display text-base font-bold tracking-[-0.03em]">ProjectForge <span className="text-primary">AI</span></div><div className="hidden font-mono-ui text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:block">career build system</div></div></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${aiStatus.data?.available ? "bg-[#3b9c72] status-pulse" : "bg-[#d69b23]"}`} />{aiStatus.data?.available ? `${aiStatus.data.model || "Local AI"} online` : "Fallback engine ready"}</div>
          <button type="button" onClick={() => setSidebarOpen(true)} data-testid="button-profile-mobile" className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted lg:hidden"><PanelLeftOpen size={18} /></button>
          <button type="button" onClick={handleGenerate} disabled={isGenerating} data-testid="button-header-generate" className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2.5 text-xs font-bold text-accent-foreground shadow-sm transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 sm:px-4 sm:text-sm">{isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}<span className="hidden sm:inline">{isGenerating ? "Building..." : "Generate briefs"}</span><span className="sm:hidden">{isGenerating ? "..." : "Build"}</span></button>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1600px]">
        <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed bottom-0 left-0 top-[70px] z-20 w-[310px] overflow-y-auto border-r border-border bg-card px-5 pb-8 pt-6 transition-transform duration-300 lg:sticky lg:top-[70px] lg:block lg:h-[calc(100dvh-70px)] lg:translate-x-0`}>
          <div className="mb-6 flex items-center justify-between lg:hidden"><span className="font-mono-ui text-[10px] uppercase tracking-[0.17em] text-muted-foreground">Profile context</span><button type="button" onClick={() => setSidebarOpen(false)} data-testid="button-close-mobile-sidebar" className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X size={16} /></button></div>
          <div className="mb-5 flex items-end justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">01 / Context</p><h2 className="mt-1 font-display text-xl font-semibold tracking-[-0.04em]">Your profile</h2></div><span className={`font-mono-ui text-[10px] ${profileReady ? "text-[#3b9c72]" : "text-muted-foreground"}`}>{profileReady ? "READY" : "DRAFT"}</span></div>
          <div className="space-y-4">
            <Field label="Target role" required><input value={profile.targetRole} onChange={(event) => updateProfile("targetRole", event.target.value)} placeholder="e.g. Backend engineer" data-testid="input-target-role" /></Field>
            <Field label="Target company"><input value={profile.targetCompany} onChange={(event) => updateProfile("targetCompany", event.target.value)} placeholder="Optional · e.g. Stripe" data-testid="input-target-company" /></Field>
            <Field label="Career goal" required><textarea value={profile.careerGoal} onChange={(event) => updateProfile("careerGoal", event.target.value)} placeholder="What do you want to prove next?" rows={2} data-testid="input-career-goal" /></Field>
            <div className="grid grid-cols-2 gap-2"><Field label="Degree"><input value={profile.degree} onChange={(event) => updateProfile("degree", event.target.value)} placeholder="B.Tech" data-testid="input-degree" /></Field><Field label="Year"><input value={profile.year} onChange={(event) => updateProfile("year", event.target.value)} placeholder="3rd" data-testid="input-year" /></Field></div>
            <Field label="University / branch"><input value={profile.university} onChange={(event) => updateProfile("university", event.target.value)} placeholder="School or program" data-testid="input-university" /><input className="mt-2" value={profile.branch} onChange={(event) => updateProfile("branch", event.target.value)} placeholder="e.g. Computer Science" data-testid="input-branch" /></Field>
            <Field label="Experience level"><select value={profile.experienceLevel} onChange={(event) => updateProfile("experienceLevel", event.target.value)} data-testid="select-experience-level"><option>Early-career</option><option>Student</option><option>Career switcher</option><option>Junior developer</option></select></Field>
            <TokenField label="Skills" tokens={profile.skills} value={skillInput} placeholder="Add a skill, press Enter" suggestions={SKILL_SUGGESTIONS} onChange={setSkillInput} onAdd={() => { addToken("skills", skillInput); setSkillInput(""); }} onRemove={(token) => removeToken("skills", token)} onSuggestion={(token) => addToken("skills", token)} testId="input-skills" />
            <Field label="Existing projects"><textarea value={profile.existingProjects} onChange={(event) => updateProfile("existingProjects", event.target.value)} placeholder="What have you already shipped?" rows={2} data-testid="input-existing-projects" /></Field>
            <Field label="Internship experience"><textarea value={profile.internshipExperience} onChange={(event) => updateProfile("internshipExperience", event.target.value)} placeholder="Teams, domains, responsibilities" rows={2} data-testid="input-internship" /></Field>
            <Field label="Learning areas"><input value={profile.learningAreas} onChange={(event) => updateProfile("learningAreas", event.target.value)} placeholder="e.g. distributed systems" data-testid="input-learning-areas" /></Field>
          </div>
          <div className="mt-6 border-t border-border pt-5"><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">02 / Direction</p><div className="mt-4 space-y-4"><Field label="Category"><select value={preferences.category} onChange={(event) => setPreferences((current) => ({ ...current, category: event.target.value }))} data-testid="select-category">{CATEGORIES.slice(1).map((item) => <option key={item}>{item}</option>)}<option>Any category</option></select></Field><Field label="Difficulty"><select value={preferences.difficulty} onChange={(event) => setPreferences((current) => ({ ...current, difficulty: event.target.value }))} data-testid="select-difficulty">{DIFFICULTIES.slice(1).map((item) => <option key={item}>{item}</option>)}<option>Any difficulty</option></select></Field><Field label={`Briefs to generate · ${preferences.count}`}><input type="range" min={1} max={8} value={preferences.count} onChange={(event) => setPreferences((current) => ({ ...current, count: Number(event.target.value) }))} data-testid="input-project-count" className="accent-primary" /></Field><TokenField label="Preferred technologies" tokens={preferences.preferredTechnologies} value={techInput} placeholder="e.g. Redis" suggestions={[]} onChange={setTechInput} onAdd={() => { addToken("preferredTechnologies", techInput); setTechInput(""); }} onRemove={(token) => removeToken("preferredTechnologies", token)} onSuggestion={() => {}} testId="input-preferred-technologies" /></div></div>
          {aiModels.data?.models?.length ? <Field label="AI model"><select value={selectedModel || aiModels.data.selected || ""} onChange={(event) => setSelectedModel(event.target.value || null)} data-testid="select-ai-model">{aiModels.data.models.map((model) => <option key={model} value={model}>{model}</option>)}</select></Field> : <div className="rounded-xl border border-dashed border-border p-3 text-[11px] leading-5 text-muted-foreground">No local Ollama models detected. The fallback engine is ready. <button type="button" onClick={() => setShowAiHelp(true)} className="font-bold text-primary hover:underline">Set up local AI</button></div>}
          <button type="button" onClick={handleGenerate} disabled={isGenerating} data-testid="button-sidebar-generate" className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/15 transition-transform hover:-translate-y-0.5 disabled:opacity-70">{isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}{isGenerating ? "Assembling..." : "Assemble project briefs"}</button>
        </aside>
        {sidebarOpen && <button type="button" onClick={() => setSidebarOpen(false)} data-testid="button-sidebar-scrim" aria-label="Close profile panel" className="fixed inset-0 top-[70px] z-10 bg-secondary/20 lg:hidden" />}
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-[1080px]">
            <section className="reveal flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
              <div><div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.19em] text-primary"><span className="h-px w-6 bg-primary" /> Build room <span className="text-muted-foreground">/</span> 2025.04</div><h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl">Build something worth<br /><span className="text-primary">putting on your resume.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Generate technically impressive project ideas tailored to your skills, career goals, and target roles.</p><div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={handleGenerate} disabled={isGenerating} data-testid="button-hero-generate" className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-70"><Sparkles size={16} /> Generate projects</button><button type="button" onClick={handleExploreExamples} data-testid="button-explore-examples" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"><Code2 size={16} /> Explore examples</button></div></div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><div className="flex -space-x-1.5">{["P", "F", "A"].map((letter) => <span key={letter} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-secondary font-mono-ui text-[10px] text-primary">{letter}</span>)}</div><span>Made for the next commit</span></div>
            </section>
            <section className="reveal reveal-delay-1 mt-7 grid gap-3 sm:grid-cols-3">
              <StatusTile icon={<Activity size={17} />} label="API connection" value={health.data?.status || (health.isLoading ? "Checking..." : "Standby")} detail={health.isError ? "Retry needed" : "Project engine reachable"} />
              <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"><div className="flex items-center gap-2 text-primary"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Cpu size={17} /></span><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Generation layer</span></div><div className="mt-3 flex items-end justify-between gap-2"><span className="font-display text-lg font-semibold tracking-[-0.03em]">{aiStatus.data?.available ? "Local AI" : "Fallback"}</span><button type="button" onClick={() => setShowAiHelp(true)} data-testid="button-local-ai-help" className="text-right text-[10px] font-bold text-primary hover:underline">How to enable</button></div><p className="mt-2 truncate text-[10px] text-muted-foreground">{aiStatus.data?.message || "Ready when you are"}</p></div>
              <StatusTile icon={<Database size={17} />} label="Your bench" value={`${savedProjects.length} saved`} detail="Stored in this browser" />
            </section>
            <section className="reveal reveal-delay-2 mt-10">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2"><h2 className="font-display text-2xl font-semibold tracking-[-0.04em]">{showSaved ? "Saved project bench" : projects.length ? "Your project briefs" : "Project workspace"}</h2>{projects.length > 0 && <span className="rounded-full bg-muted px-2 py-1 font-mono-ui text-[10px] text-muted-foreground">{visibleProjects.length} shown</span>}</div><p className="mt-1 text-sm text-muted-foreground">{showSaved ? "Ideas you marked for a deeper build session." : projects.length ? "Filter, compare, then open the brief with the most useful stretch." : "Configure a profile, then generate your first set."}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => setShowSaved(false)} data-testid="button-show-workspace" className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${!showSaved ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Workspace</button><button type="button" onClick={() => setShowSaved(true)} data-testid="button-show-saved" className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${showSaved ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Bookmark size={14} /> Saved ({savedProjects.length})</button></div></div>
              {errorMessage && <div className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/8 p-4 text-sm text-destructive"><div className="flex gap-2"><CircleHelp size={17} className="mt-0.5 shrink-0" /><span>{errorMessage}</span></div><button type="button" onClick={() => setErrorMessage("")} data-testid="button-dismiss-error" className="shrink-0"><X size={16} /></button></div>}
              {notice && <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#3b9c72]/25 bg-[#3b9c72]/8 p-3 text-sm text-[#276e50]"><Check size={16} />{notice}</div>}
              {projects.length > 0 || showSaved ? <><div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row"><div className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your briefs" data-testid="input-search-projects" className="w-full border-0 bg-transparent pl-9 text-sm outline-none ring-0 placeholder:text-muted-foreground/70" /></div><div className="flex gap-2 overflow-x-auto"><div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground"><Filter size={14} /> <span className="hidden sm:inline">Filter</span></div>{categories.map((category) => <button type="button" key={category} onClick={() => setActiveCategory(category)} data-testid={`button-filter-category-${category.replace(/\s+/g, "-").toLowerCase()}`} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${activeCategory === category ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted"}`}>{category}</button>)}<select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} data-testid="select-sort-projects" className="rounded-lg border-0 bg-muted px-2.5 text-xs font-bold text-foreground outline-none"><option value="fit">Best fit</option><option value="depth">Technical depth</option><option value="recent">Recently saved</option></select></div></div>{isGenerating ? <LoadingCards /> : visibleProjects.length ? <div className="grid gap-4 lg:grid-cols-2">{visibleProjects.map((project) => <ProjectCard key={project.id} project={project} saved={savedProjects.some((item) => item.id === project.id)} onSave={() => toggleSaved(project)} onInspect={() => setSelectedProject(project)} />)}</div> : <div className="rounded-2xl border border-dashed border-border p-12 text-center"><p className="font-display text-xl font-semibold">Nothing matches this cut.</p><button type="button" onClick={() => { setQuery(""); setActiveCategory("All"); }} data-testid="button-clear-filters" className="mt-3 text-sm font-bold text-primary hover:underline">Clear filters</button></div>}</> : isGenerating ? <LoadingCards /> : <EmptyWorkspace onGenerate={handleGenerate} hasProfile={profileReady} />}
            </section>
            <footer className="mt-16 flex flex-col justify-between gap-3 border-t border-border py-6 text-[11px] text-muted-foreground sm:flex-row"><div className="flex items-center gap-2 font-mono-ui uppercase tracking-[0.13em]"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> ProjectForge AI</div><div className="flex items-center gap-4"><span>Local-first by design</span><span>·</span><span>{aiModels.data?.models?.length || 0} model{aiModels.data?.models?.length === 1 ? "" : "s"} detected</span></div></footer>
          </div>
        </main>
      </div>
      {selectedProject && <ProjectDrawer project={selectedProject} saved={savedProjects.some((item) => item.id === selectedProject.id)} onClose={() => setSelectedProject(null)} onSave={() => toggleSaved(selectedProject)} onRegenerate={(request) => handleRegenerate(selectedProject, request)} regenerating={isGenerating} />}
      {showAiHelp && <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/35 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="How to enable local AI"><button type="button" onClick={() => setShowAiHelp(false)} className="absolute inset-0 cursor-default" aria-label="Close local AI help" /><div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-primary">Local-first setup</p><h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">How to enable Local AI</h2></div><button type="button" onClick={() => setShowAiHelp(false)} data-testid="button-close-ai-help" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div><p className="mt-4 text-sm leading-6 text-muted-foreground">Install Ollama from <a className="font-bold text-primary underline" href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com</a>, then run these commands in your terminal:</p><div className="mt-5 space-y-3"><code className="block rounded-xl bg-secondary px-4 py-3 font-mono-ui text-xs text-secondary-foreground">ollama pull qwen3:8b</code><code className="block rounded-xl bg-secondary px-4 py-3 font-mono-ui text-xs text-secondary-foreground">ollama list</code></div><p className="mt-4 text-xs leading-5 text-muted-foreground">Refresh this page after Ollama is running. ProjectForge will automatically pick the best installed model. You can keep using the fallback engine at any time.</p><button type="button" onClick={() => setShowAiHelp(false)} className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Done</button></div></div>}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="block text-xs font-bold text-foreground"><span className="mb-1.5 block">{label}{required && <span className="ml-1 text-accent">*</span>}</span>{children}</label>;
}

function TokenField({ label, tokens, value, placeholder, suggestions, onChange, onAdd, onRemove, onSuggestion, testId }: { label: string; tokens: string[]; value: string; placeholder: string; suggestions: string[]; onChange: (value: string) => void; onAdd: () => void; onRemove: (token: string) => void; onSuggestion: (token: string) => void; testId: string }) {
  return <div><label className="block text-xs font-bold">{label}</label><div className="mt-1.5 rounded-xl border border-input bg-background px-2.5 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10"><div className="flex flex-wrap gap-1.5">{tokens.map((token) => <span key={token} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">{token}<button type="button" onClick={() => onRemove(token)} data-testid={`button-remove-token-${token.replace(/\s+/g, "-").toLowerCase()}`} aria-label={`Remove ${token}`}><X size={12} /></button></span>)}<input value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); onAdd(); } }} placeholder={tokens.length ? "Add another..." : placeholder} data-testid={testId} className="token-editor min-w-[100px] flex-1 bg-transparent py-1 text-xs outline-none" /></div></div>{suggestions.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{suggestions.filter((suggestion) => !tokens.includes(suggestion)).slice(0, 4).map((suggestion) => <button type="button" key={suggestion} onClick={() => onSuggestion(suggestion)} data-testid={`button-suggest-${suggestion.replace(/\s+/g, "-").toLowerCase()}`} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"><Plus size={11} />{suggestion}</button>)}</div>}</div>;
}

function StatusTile({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"><div className="flex items-center gap-2 text-primary"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">{icon}</span><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span></div><div className="mt-3 flex items-end justify-between gap-2"><span className="font-display text-lg font-semibold tracking-[-0.03em]">{value}</span><span className="text-right text-[10px] text-muted-foreground">{detail}</span></div></div>;
}