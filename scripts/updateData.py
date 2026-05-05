"""
AI Supply Chain Observatory - Live Data Updater
Fetches real-time CVEs, package data, and incidents.
Maintains existing merged format. Run via GitHub Actions daily.
"""

import requests
import json
import os
import re
from datetime import datetime
from typing import List, Dict, Optional
import time

# ── Package list ──────────────────────────────────────────────────────────────

AI_PACKAGES = [
    # Provider SDKs
    "openai", "anthropic", "google-generativeai", "cohere", "mistralai",
    # Agent frameworks
    "langchain", "langchain-core", "langchain-community",
    "llama-index", "llama-index-core",
    "crewai", "autogen-agentchat", "smolagents", "dspy-ai",
    "haystack-ai", "semantic-kernel",
    # ML frameworks
    "torch", "tensorflow", "jax", "keras",
    # AI libraries
    "transformers", "sentence-transformers", "diffusers",
    "peft", "trl", "accelerate", "datasets", "huggingface-hub",
    "timm", "torchvision", "evaluate",
    # Vector DBs
    "chromadb", "pinecone-client", "weaviate-client",
    "qdrant-client", "lancedb",
    # AI tooling
    "safetensors", "tiktoken", "tokenizers", "sentencepiece",
    "onnx", "onnxruntime", "bitsandbytes", "einops", "litellm",
    # Serving / infra
    "vllm", "ollama", "ray", "gradio", "streamlit",
    "fastapi", "uvicorn", "celery", "grpcio",
    "mlflow", "wandb", "bentoml",
    # MCP
    "mcp",
    # Core scientific
    "numpy", "pandas", "scipy", "scikit-learn",
    "matplotlib", "pillow", "joblib", "pyarrow", "sympy",
    # Utilities
    "requests", "httpx", "urllib3", "certifi", "pydantic",
    "pyyaml", "protobuf", "packaging", "tqdm", "filelock",
    "aiohttp", "tenacity", "cryptography", "jinja2",
    "sqlalchemy", "fsspec", "paramiko",
    # Provider infra
    "boto3",
]

# ── Layer mapping ─────────────────────────────────────────────────────────────

LAYER_MAP = {
    "openai": "provider", "anthropic": "provider", "google-generativeai": "provider",
    "cohere": "provider", "mistralai": "provider", "boto3": "provider",
    "litellm": "provider",
    "langchain": "agent", "langchain-core": "agent", "langchain-community": "agent",
    "llama-index": "agent", "llama-index-core": "agent",
    "crewai": "agent", "autogen-agentchat": "agent", "smolagents": "agent",
    "dspy-ai": "agent", "haystack-ai": "agent", "semantic-kernel": "agent",
    "torch": "framework", "tensorflow": "framework", "jax": "framework",
    "keras": "framework",
    "transformers": "ai-lib", "sentence-transformers": "ai-lib",
    "diffusers": "ai-lib", "peft": "ai-lib", "trl": "ai-lib",
    "accelerate": "ai-lib", "datasets": "ai-lib", "huggingface-hub": "ai-lib",
    "timm": "ai-lib", "torchvision": "ai-lib", "evaluate": "ai-lib",
    "chromadb": "vector-db", "pinecone-client": "vector-db",
    "weaviate-client": "vector-db", "qdrant-client": "vector-db",
    "lancedb": "vector-db",
    "safetensors": "ai-tool", "tiktoken": "ai-tool", "tokenizers": "ai-tool",
    "sentencepiece": "ai-tool", "onnx": "ai-tool", "onnxruntime": "ai-tool",
    "bitsandbytes": "ai-tool", "einops": "ai-tool",
    "vllm": "infra", "ollama": "infra", "ray": "infra",
    "gradio": "infra", "streamlit": "infra", "fastapi": "infra",
    "uvicorn": "infra", "celery": "infra", "grpcio": "infra",
    "mlflow": "app", "wandb": "app", "bentoml": "app",
    "mcp": "mcp",
    "numpy": "core", "pandas": "core", "scipy": "core",
    "scikit-learn": "core", "matplotlib": "core", "pillow": "core",
    "joblib": "core", "pyarrow": "core", "sympy": "core",
}

# Anything not in LAYER_MAP falls back to "util"

# ── Label overrides ───────────────────────────────────────────────────────────

LABEL_MAP = {
    "openai": "OpenAI SDK", "anthropic": "Anthropic SDK",
    "google-generativeai": "Google GenAI", "cohere": "Cohere SDK",
    "mistralai": "Mistral SDK", "boto3": "boto3 (Bedrock)",
    "litellm": "LiteLLM", "langchain": "LangChain",
    "langchain-core": "LangChain Core", "langchain-community": "LC Community",
    "llama-index": "LlamaIndex", "llama-index-core": "LlamaIndex Core",
    "crewai": "CrewAI", "autogen-agentchat": "AutoGen",
    "smolagents": "smolagents", "dspy-ai": "DSPy",
    "haystack-ai": "Haystack", "semantic-kernel": "Semantic Kernel",
    "torch": "PyTorch", "tensorflow": "TensorFlow", "jax": "JAX",
    "keras": "Keras", "transformers": "Transformers",
    "sentence-transformers": "Sentence-Transformers",
    "diffusers": "Diffusers", "peft": "PEFT", "trl": "TRL",
    "accelerate": "Accelerate", "datasets": "Datasets",
    "huggingface-hub": "HF Hub", "timm": "timm",
    "torchvision": "torchvision", "evaluate": "Evaluate",
    "chromadb": "ChromaDB", "pinecone-client": "Pinecone",
    "weaviate-client": "Weaviate", "qdrant-client": "Qdrant",
    "lancedb": "LanceDB", "safetensors": "safetensors",
    "tiktoken": "tiktoken", "tokenizers": "Tokenizers",
    "sentencepiece": "SentencePiece", "onnx": "ONNX",
    "onnxruntime": "ONNX Runtime", "bitsandbytes": "bitsandbytes",
    "einops": "einops", "vllm": "vLLM", "ollama": "Ollama",
    "ray": "Ray", "gradio": "Gradio", "streamlit": "Streamlit",
    "fastapi": "FastAPI", "uvicorn": "uvicorn", "celery": "Celery",
    "grpcio": "gRPC", "mlflow": "MLflow", "wandb": "Weights & Biases",
    "bentoml": "BentoML", "mcp": "MCP SDK", "numpy": "NumPy",
    "pandas": "Pandas", "scipy": "SciPy", "scikit-learn": "scikit-learn",
    "matplotlib": "Matplotlib", "pillow": "Pillow", "joblib": "joblib",
    "pyarrow": "PyArrow", "sympy": "SymPy", "requests": "Requests",
    "httpx": "HTTPX", "urllib3": "urllib3", "certifi": "certifi",
    "pydantic": "Pydantic", "pyyaml": "PyYAML", "protobuf": "Protobuf",
    "packaging": "packaging", "tqdm": "tqdm", "filelock": "filelock",
    "aiohttp": "aiohttp", "tenacity": "tenacity",
    "cryptography": "cryptography", "jinja2": "Jinja2",
    "sqlalchemy": "SQLAlchemy", "fsspec": "fsspec", "paramiko": "paramiko",
}

# ── Colors (kept stable — do not auto-generate) ───────────────────────────────

GROUP_COLORS = {
    "hardware":  { "fill": "#1a6bbd", "stroke": "#5ab0ff", "text": "#e8f4ff", "glow": "#3a8fff" },
    "core":      { "fill": "#6b2fcc", "stroke": "#b47aff", "text": "#f0e8ff", "glow": "#9955ff" },
    "util":      { "fill": "#2a4fcc", "stroke": "#7a9fff", "text": "#e8eeff", "glow": "#5577ff" },
    "framework": { "fill": "#0d8a6a", "stroke": "#2effc0", "text": "#e0fff6", "glow": "#00ddaa" },
    "ai-lib":    { "fill": "#991aaa", "stroke": "#ee66ff", "text": "#ffe8ff", "glow": "#dd44ff" },
    "vector-db": { "fill": "#6620aa", "stroke": "#bb77ff", "text": "#f0e4ff", "glow": "#9944ee" },
    "ai-tool":   { "fill": "#1a7a40", "stroke": "#44ff88", "text": "#e0ffe8", "glow": "#22ee66" },
    "provider":  { "fill": "#aa6a00", "stroke": "#ffcc33", "text": "#fff8e0", "glow": "#ffaa00" },
    "infra":     { "fill": "#007a7a", "stroke": "#00ffee", "text": "#e0fffd", "glow": "#00ddcc" },
    "agent":     { "fill": "#aa1a40", "stroke": "#ff4488", "text": "#ffe0ea", "glow": "#ff2266" },
    "mcp":       { "fill": "#5a8800", "stroke": "#aaee22", "text": "#f4ffe0", "glow": "#88dd00" },
    "app":       { "fill": "#cc4400", "stroke": "#ff8833", "text": "#fff0e0", "glow": "#ff6600" }
}

LAYERS = {
    "hardware":  { "name": "Hardware & Compute",       "color": "#5ab0ff", "order": 0   },
    "core":      { "name": "Core Scientific",           "color": "#b47aff", "order": 1   },
    "util":      { "name": "Utilities & Networking",    "color": "#7a9fff", "order": 1.5 },
    "framework": { "name": "ML Frameworks",             "color": "#2effc0", "order": 2   },
    "ai-lib":    { "name": "AI Libraries",              "color": "#ee66ff", "order": 3   },
    "vector-db": { "name": "Vector Databases",          "color": "#bb77ff", "order": 3.5 },
    "ai-tool":   { "name": "AI Tooling",                "color": "#44ff88", "order": 4   },
    "provider":  { "name": "Provider SDKs",             "color": "#ffcc33", "order": 4.5 },
    "infra":     { "name": "Serving & Infra",           "color": "#00ffee", "order": 5   },
    "agent":     { "name": "Agent Frameworks",          "color": "#ff4488", "order": 6   },
    "mcp":       { "name": "MCP & Tool Layer",          "color": "#aaee22", "order": 6.5 },
    "app":       { "name": "Applications & Platforms",  "color": "#ff8833", "order": 7   }
}


# Helpers 

def parse_dep_name(raw: str) -> str:
    """Extract clean package name from a raw requirement string."""
    name = re.split(r"[<>=!,;\s\[\(]", raw)[0].strip().lower()
    return name


def normalise_severity(raw: str) -> str:
    mapping = {
        "CRITICAL": "CRITICAL", "HIGH": "HIGH",
        "MODERATE": "MEDIUM",   "MEDIUM": "MEDIUM",
        "LOW": "LOW",           "UNKNOWN": "MEDIUM",
    }
    return mapping.get((raw or "").upper(), "MEDIUM")


def calculate_risk_score(cves: list, dep_count: int) -> int:
    score = 0
    for cve in cves:
        s = (cve.get("severity") or "LOW").upper()
        score += {"CRITICAL": 40, "HIGH": 25, "MEDIUM": 10, "LOW": 5}.get(s, 5)
    score += min(dep_count * 2, 30)
    return min(score, 100)


# ── API fetchers ──────────────────────────────────────────────────────────────

def fetch_pypi(package_name: str) -> Optional[Dict]:
    try:
        r = requests.get(f"https://pypi.org/pypi/{package_name}/json", timeout=10)
        if r.status_code != 200:
            return None
        info = r.json()["info"]
        return {
            "version":     info["version"],
            "description": (info.get("summary") or "").strip(),
            "author":      info.get("author") or info.get("maintainer") or "Unknown",
            "license":     info.get("license") or "Unknown",
            "deps":        list({parse_dep_name(d)
                                 for d in (info.get("requires_dist") or [])
                                 if d and "extra ==" not in d}),
        }
    except Exception as e:
        print(f"  PyPI error ({package_name}): {e}")
        return None


def fetch_downloads(package_name: str) -> int:
    try:
        r = requests.get(
            f"https://pypistats.org/api/packages/{package_name}/recent",
            timeout=10,
        )
        if r.status_code == 200:
            return r.json().get("data", {}).get("last_month", 0)
    except Exception:
        pass
    return 0


def fetch_osv(package_name: str) -> List[Dict]:
    try:
        r = requests.post(
            "https://api.osv.dev/v1/query",
            json={"package": {"name": package_name, "ecosystem": "PyPI"}},
            timeout=15,
        )
        if r.status_code != 200:
            return []
        vulns = []
        for v in r.json().get("vulns", []):
            # Pull CVSS score if present
            score = None
            for s in v.get("severity", []):
                if s.get("type") in ("CVSS_V3", "CVSS_V2"):
                    try:
                        score = float(s.get("score", "").split("/")[0])
                    except Exception:
                        pass
                    break

            severity_raw = (
                v.get("database_specific", {}).get("severity")
                or v.get("affected", [{}])[0]
                   .get("database_specific", {})
                   .get("severity", "MEDIUM")
            )

            vulns.append({
                "id":       v.get("id", "UNKNOWN"),
                "severity": normalise_severity(severity_raw),
                "score":    score,
                "desc":     v.get("summary", "No description available"),
                "year":     int(v["published"][:4]) if v.get("published") else None,
                "refs":     [ref.get("url") for ref in v.get("references", []) if ref.get("url")],
            })
        return vulns
    except Exception as e:
        print(f"  OSV error ({package_name}): {e}")
        return []


def fetch_github_advisories(package_name: str, token: Optional[str]) -> List[Dict]:
    if not token:
        return []
    query = """
    query($pkg: String!) {
      securityVulnerabilities(first: 10, ecosystem: PIP, package: $pkg) {
        nodes {
          advisory {
            ghsaId summary severity publishedAt
            references { url }
            cvss { score }
          }
        }
      }
    }
    """
    try:
        r = requests.post(
            "https://api.github.com/graphql",
            json={"query": query, "variables": {"pkg": package_name}},
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        if r.status_code != 200:
            return []
        advisories = []
        nodes = (
            r.json()
             .get("data", {})
             .get("securityVulnerabilities", {})
             .get("nodes", [])
        )
        for node in nodes:
            adv = node.get("advisory", {})
            advisories.append({
                "id":       adv.get("ghsaId", "UNKNOWN"),
                "severity": normalise_severity(adv.get("severity", "MEDIUM")),
                "score":    adv.get("cvss", {}).get("score"),
                "desc":     adv.get("summary", ""),
                "year":     int(adv["publishedAt"][:4]) if adv.get("publishedAt") else None,
                "refs":     [ref.get("url") for ref in adv.get("references", []) if ref.get("url")],
            })
        return advisories
    except Exception as e:
        print(f"  GitHub Advisory error ({package_name}): {e}")
        return []


def merge_cves(existing: List[Dict], fresh: List[Dict]) -> List[Dict]:
    """
    Merge fresh CVEs into existing list.
    - Existing entries are kept as-is (preserves manual curation).
    - New IDs are appended.
    - No duplicates by id.
    """
    seen = {c["id"] for c in existing}
    merged = list(existing)
    for cve in fresh:
        if cve["id"] not in seen:
            merged.append(cve)
            seen.add(cve["id"])
    return merged


def compute_blast_radii(packages: List[Dict]) -> None:
    """BFS on reversed dependency graph. Mutates packages in-place."""
    # Build reverse adjacency: target → list of sources that depend on it
    dependents: Dict[str, List[str]] = {p["id"]: [] for p in packages}
    pkg_ids = {p["id"] for p in packages}

    for pkg in packages:
        for dep in pkg.get("deps", []):
            if dep in pkg_ids:
                dependents[dep].append(pkg["id"])

    for pkg in packages:
        visited = set()
        queue = [pkg["id"]]
        depth = 0
        frontier = [pkg["id"]]

        while frontier:
            next_frontier = []
            for node in frontier:
                if node in visited:
                    continue
                visited.add(node)
                for dependent in dependents.get(node, []):
                    if dependent not in visited:
                        next_frontier.append(dependent)
            if next_frontier:
                depth += 1
            frontier = next_frontier

        pkg["blast_radius"] = {
            "total_affected": len(visited) - 1,  # exclude self
            "cascade_depth":  depth,
        }


# ── Main updater ──────────────────────────────────────────────────────────────

def update(existing_path: str, output_path: str) -> None:
    github_token = os.getenv("GITHUB_TOKEN")

    # Load existing data so we can preserve manually curated fields
    existing_pkg_map: Dict[str, Dict] = {}
    if os.path.exists(existing_path):
        with open(existing_path) as f:
            existing_data = json.load(f)
        for p in existing_data.get("packages", []):
            existing_pkg_map[p["id"]] = p
        print(f"Loaded {len(existing_pkg_map)} existing packages from {existing_path}")
    else:
        existing_data = {}
        print("No existing data file found — building from scratch")

    packages = []
    total_new_cves = 0

    for i, pkg_id in enumerate(AI_PACKAGES, 1):
        print(f"[{i}/{len(AI_PACKAGES)}] {pkg_id}")

        pypi = fetch_pypi(pkg_id)
        if not pypi:
            print(f"  Skipping — PyPI fetch failed")
            # Keep existing entry if we have it
            if pkg_id in existing_pkg_map:
                packages.append(existing_pkg_map[pkg_id])
            continue

        downloads = fetch_downloads(pkg_id)
        time.sleep(0.3)  # be polite to pypistats

        # Fetch fresh CVEs
        osv_cves = fetch_osv(pkg_id)
        gh_cves  = fetch_github_advisories(pkg_id, github_token)
        time.sleep(0.5)

        # Merge with existing CVEs (preserves manual curation, deduplicates)
        existing_cves = existing_pkg_map.get(pkg_id, {}).get("cves", [])
        fresh_cves    = osv_cves + gh_cves
        merged_cves   = merge_cves(existing_cves, fresh_cves)

        new_count = len(merged_cves) - len(existing_cves)
        if new_count > 0:
            print(f"  +{new_count} new CVE(s)")
            total_new_cves += new_count

        # Resolve deps to only known package IDs
        known_ids    = set(AI_PACKAGES)
        resolved_deps = [d for d in pypi["deps"] if d in known_ids]

        pkg_entry = {
            # Identity
            "id":          pkg_id,
            "label":       LABEL_MAP.get(pkg_id, pkg_id),
            "group":       LAYER_MAP.get(pkg_id, "util"),
            # Live data
            "version":     pypi["version"],
            "description": pypi["description"],
            "maintainer":  pypi["author"],
            "license":     pypi["license"],
            "downloads":   downloads,
            "deps":        resolved_deps,
            # Security
            "cves":        merged_cves,
            "risk_score":  calculate_risk_score(merged_cves, len(resolved_deps)),
            # Blast radius filled in below
            "blast_radius": {"total_affected": 0, "cascade_depth": 0},
            # Preserve any manually curated incidents field
            "incidents":   existing_pkg_map.get(pkg_id, {}).get("incidents", []),
            "last_updated": datetime.utcnow().isoformat() + "Z",
        }

        packages.append(pkg_entry)

    # Compute blast radii after all packages are assembled
    print("\nComputing blast radii...")
    compute_blast_radii(packages)

    output = {
        "metadata": {
            "generated_at":    datetime.utcnow().isoformat() + "Z",
            "total_packages":  len(packages),
            "total_cves":      sum(len(p["cves"]) for p in packages),
            "new_cves_this_run": total_new_cves,
            "description":     "AI/ML supply chain data — auto-updated daily",
            "data_sources":    ["PyPI", "OSV.dev", "GitHub Security Advisories", "Manual Curation"],
        },
        "layers":       LAYERS,
        "group_colors": GROUP_COLORS,
        "packages":     packages,
    }

    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nDone — {len(packages)} packages, {output['metadata']['total_cves']} CVEs total, {total_new_cves} new this run")
    print(f"Saved to {output_path}")


if __name__ == "__main__":
    update(
        existing_path="src/data/rawData.json",
        output_path="src/data/rawData.json",
    )