import { PACKAGES as _RAW_PACKAGES, LAYERS, GROUP_COLORS, GROUP_LABELS } from "./packages";
import { INCIDENTS } from "./incidents";
import { EDGES } from "./edges";

// ─── Join incidents onto packages by package id ───────────────────────────────
const incidentsByPkg = {};
INCIDENTS.forEach((inc) => {
  if (!incidentsByPkg[inc.package]) incidentsByPkg[inc.package] = [];
  incidentsByPkg[inc.package].push(inc.id);
});

export const PACKAGES = _RAW_PACKAGES.map((p) => ({
  ...p,
  incidents: incidentsByPkg[p.id] ?? [],
}));

export { LAYERS, GROUP_COLORS, GROUP_LABELS, EDGES, INCIDENTS };

// ─── Severity colour map ──────────────────────────────────────────────────────
export const SEVERITY_COLOR = {
  CRITICAL: "#ef4444",
  HIGH:     "#f97316",
  MEDIUM:   "#eab308",
  LOW:      "#22c55e",
};

// ─── Attack path presets ──────────────────────────────────────────────────────
export const ATTACK_PATHS = [
  { id: "litellm-supply-chain", label: "LiteLLM Compromise", desc: "TeamPCP backdoors LiteLLM v1.82.7/8 on PyPI → harvests all LLM API keys (OpenAI, Anthropic, Google) → persistent .pth backdoor survives uninstall (Mar 2026)", steps: ["litellm", "openai", "anthropic", "google-generativeai"] },
  { id: "llm-rce",         label: "LLM RCE Chain",     desc: "Unauthenticated RCE via /api/v1/validate/code → Flodrix botnet DDoS + data exfiltration (May 2025, CVE-2025-3248 CVSS 9.8, added to CISA KEV)",                 steps:  ["langflow", "langchain", "langchain-community", "sqlalchemy"] },
  { id: "agent-injection", label: "Agent Injection",   desc: "Prompt injection → CrewAI → credential exfil",  steps: ["crewai",       "langchain",    "langchain-community","celery"      ] },
  { id: "mcp-hijack",      label: "MCP Toolpoisoning", desc: "Malicious MCP server → agent hijack",           steps: ["mcp",          "anthropic",    "langchain-core",    "safetensors" ] },
  { id: "model-backdoor",  label: "Model Backdoor",    desc: "HF Hub pickle → transformers → GPU cluster",    steps: ["transformers", "safetensors",  "torch",             "onnx"        ] },
];

// ─── Format helpers ───────────────────────────────────────────────────────────
export function fmtDownloads(n) {
  if (!n || n === 0) return "N/A";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(0) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toLocaleString();
}

export function fmtDate(iso) {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

// ─── Risk helpers ─────────────────────────────────────────────────────────────
// risk_score is pre-computed by the scraper — just read it off the package.
export function riskScore(pkg) {
  return pkg?.risk_score ?? 0;
}

export function riskLabel(score) {
  if (score >= 70) return { label: "Critical", color: "#ef4444" };
  if (score >= 45) return { label: "High",     color: "#f97316" };
  if (score >= 20) return { label: "Medium",   color: "#eab308" };
  return               { label: "Low",      color: "#22c55e" };
}

// ─── Aggregate stats ──────────────────────────────────────────────────────────
export function getStats() {
  const totalCVEs      = PACKAGES.reduce((a, p) => a + (p.cves?.length ?? 0), 0);
  const criticalPkgs   = PACKAGES.filter((p) => riskScore(p) >= 70).length;
  const totalDownloads = PACKAGES.reduce((a, p) => a + (p.downloads ?? 0), 0);
  return { totalCVEs, criticalPkgs, totalDownloads, totalIncidents: INCIDENTS.length };
}

// ─── BFS blast radius (for animated wave simulation in BlastTab) ──────────────
// Pre-computed totals live on pkg.blast_radius; this gives the wave breakdown.
export function computeBlastRadius(pkgId) {
  const reverseAdj = {};
  PACKAGES.forEach((p) => { reverseAdj[p.id] = []; });
  EDGES.forEach((e) => {
    if (!reverseAdj[e.target]) reverseAdj[e.target] = [];
    reverseAdj[e.target].push(e.source);
  });

  const visited  = new Set([pkgId]);
  const waves    = [];
  let   frontier = [pkgId];

  while (frontier.length) {
    const next = [];
    frontier.forEach((node) => {
      (reverseAdj[node] ?? []).forEach((nb) => {
        if (!visited.has(nb)) { visited.add(nb); next.push(nb); }
      });
    });
    if (next.length) waves.push([...next]);
    frontier = next;
  }

  return {
    affected: [...visited].filter((id) => id !== pkgId),
    waves,
  };
}