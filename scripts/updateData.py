#!/usr/bin/env python3
"""
AI Supply Chain Observatory — Data Updater
==========================================
Additive-only. Never removes or overwrites curated data.

What it does:
  1. Updates: version, downloads, maintainer, last_updated on existing packages
  2. Appends: new CVEs not already present (matched by ID)
  3. Adds:    brand-new packages from PyPI+OSV if AI/ML relevant, in exact format
  4. Recomputes blast_radius after any structural changes

What it NEVER touches on existing packages:
  label, group, deps, risk_score, description, incidents

Usage:
  python scripts/update_supply_chain.py
  python scripts/update_supply_chain.py --add llmguard presidio-analyzer
  python scripts/update_supply_chain.py --dry-run
"""

import re
import os
import sys
import json
import time
import logging
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    sys.exit("Missing dependency: pip install requests")

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("observatory")

# ── Constants ─────────────────────────────────────────────────────────────────

PYPI_BASE  = "https://pypi.org/pypi"
PYPISTATS  = "https://pypistats.org/api/packages"
OSV_URL    = "https://api.osv.dev/v1/query"
GH_GRAPHQL = "https://api.github.com/graphql"
TIMEOUT    = 15
RATE_LIMIT = 0.35   # seconds between requests — polite to public APIs

# ── Layer inference rules ─────────────────────────────────────────────────────
# Ordered — first match wins

LAYER_RULES = [
    (["cuda", "gpu", "nvidia", "rocm", "opencl", "tpu"],                     "hardware"),
    (["model context protocol", " mcp "],                                     "mcp"),
    (["agent framework", "multi-agent", "autonomous agent", "orchestrat"],    "agent"),
    (["openai", "anthropic", "cohere", "mistral", "gemini", "groq",
      "llm api", "language model api", "provider sdk"],                       "provider"),
    (["vector database", "vector store", "similarity search",
      "approximate nearest", " ann ", "embedding store"],                     "vector-db"),
    (["model serving", "inference server", "llm serving", "deploy model"],   "infra"),
    (["chatbot ui", "llm application", "workflow builder", "ai platform"],    "app"),
    (["hugging face", "huggingface", "diffusion model",
      "fine-tun", "rlhf", "lora adapter"],                                   "ai-lib"),
    (["tokenizer", "tokenization", "safetensor", "onnx", "quantiz",
      "model format"],                                                         "ai-tool"),
    (["deep learning", "neural network", "gradient boost",
      "machine learning framework"],                                           "framework"),
    (["scientific computing", "numerical", "linear algebra",
      "image processing", "signal processing"],                               "core"),
]

AI_ML_SIGNALS = [
    "machine learning", "deep learning", "neural network", "large language",
    "llm", "language model", "artificial intelligence", " ai ", "transformer",
    "embedding", "vector", "inference", "training", "model weights", "gpu",
    "cuda", "hugging face", "openai", "anthropic", "diffusion", "generative",
    "rag", "retrieval augmented", "agent", "tokenizer", "fine-tun", "pytorch",
    "tensorflow", "jax", "onnx", "chatgpt", "llama",
]

# HTTP session with retries

def make_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://",  adapter)
    session.headers["User-Agent"] = "ai-supply-chain-observatory/1.0 (github-actions)"
    return session

SESSION = make_session()

# ── Helpers ───────────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def parse_dep_name(raw: str) -> str:
    """Strip version constraints and extras from a requirement string."""
    return re.split(r"[<>=!,;\s\[\(]", raw)[0].strip().lower()


def normalise_severity(raw: str) -> str:
    return {
        "CRITICAL": "CRITICAL", "HIGH":     "HIGH",
        "MODERATE": "HIGH",     "MEDIUM":   "MEDIUM",
        "LOW":      "LOW",
    }.get((raw or "").upper(), "MEDIUM")


def severity_to_score(sev: str) -> float:
    return {"CRITICAL": 9.5, "HIGH": 7.5, "MEDIUM": 5.5, "LOW": 3.0}.get(sev, 5.0)


def infer_group(info: dict) -> tuple[str, bool]:
    """
    Returns (group, needs_review).
    needs_review=True when no rule matched and we fell back to util.
    """
    blob = " ".join([
        info.get("name", ""),
        info.get("summary", "") or "",
        info.get("keywords", "") or "",
        " ".join(info.get("classifiers", [])),
    ]).lower()

    for signals, group in LAYER_RULES:
        if any(s in blob for s in signals):
            return group, False

    return "util", True


def is_ai_ml_relevant(info: dict) -> bool:
    blob = " ".join([
        info.get("name", ""),
        info.get("summary", "") or "",
        info.get("keywords", "") or "",
        " ".join(info.get("classifiers", [])),
    ]).lower()
    return any(sig in blob for sig in AI_ML_SIGNALS)


def humanize_label(pkg_id: str) -> str:
    OVERRIDES = {
        "scikit-learn": "scikit-learn",       "huggingface-hub": "HuggingFace Hub",
        "sentence-transformers": "Sentence Transformers",
        "langchain-core": "LangChain Core",   "langchain-community": "LangChain Community",
        "llama-index": "LlamaIndex",           "llama-index-core": "LlamaIndex Core",
        "openai-agents-sdk": "OpenAI Agents SDK",
        "google-generativeai": "Google GenAI","onnxruntime": "ONNX Runtime",
        "mcp-sdk": "MCP Python SDK",           "llama-cpp-python": "llama.cpp Python",
        "tensorrt-llm": "TensorRT-LLM",        "pyyaml": "PyYAML",
        "opencv-python": "OpenCV",             "open-webui": "Open WebUI",
    }
    return OVERRIDES.get(pkg_id, pkg_id.replace("-", " ").replace("_", " ").title())


# ── CVE helpers ───────────────────────────────────────────────────────────────

def osv_to_cve(v: dict) -> dict:
    """Convert a raw OSV vulnerability object to merged_supply_chain CVE format."""
    aliases = v.get("aliases", [])
    cve_id  = next((a for a in aliases if a.startswith("CVE-")), v.get("id", "UNKNOWN"))

    sev_raw = (
        v.get("database_specific", {}).get("severity")
        or next(
            (s.get("score", "") for s in v.get("severity", [])
             if s.get("type") in ("CVSS_V3", "CVSS_V4")),
            "MEDIUM",
        )
    )
    sev = normalise_severity(sev_raw)

    published = v.get("published", "")
    year = int(published[:4]) if published and len(published) >= 4 else datetime.now().year

    return {
        "id":       cve_id,
        "severity": sev,
        "score":    severity_to_score(sev),
        "desc":     (v.get("summary") or v.get("details") or "")[:300],
        "year":     year,
        "refs":     [r["url"] for r in v.get("references", []) if r.get("url")][:3],
    }


def merge_cves(existing: list, incoming: list) -> tuple[list, int]:
    """
    Append incoming CVEs not already in existing (matched by id).
    Existing entries are NEVER modified.
    Returns (merged_list, count_added).
    """
    seen   = {c["id"] for c in existing}
    merged = list(existing)
    added  = 0
    for cve in incoming:
        if cve["id"] not in seen:
            merged.append(cve)
            seen.add(cve["id"])
            added += 1
    return merged, added


# ── API fetchers ──────────────────────────────────────────────────────────────

def fetch_pypi(name: str) -> Optional[dict]:
    try:
        r = SESSION.get(f"{PYPI_BASE}/{name}/json", timeout=TIMEOUT)
        if r.status_code == 404:
            log.warning(f"PyPI 404: {name}")
            return None
        r.raise_for_status()
        return r.json().get("info", {})
    except Exception as e:
        log.error(f"PyPI error ({name}): {e}")
        return None


def fetch_downloads(name: str) -> int:
    try:
        r = SESSION.get(f"{PYPISTATS}/{name}/recent", timeout=TIMEOUT)
        if r.status_code == 200:
            return r.json().get("data", {}).get("last_month", 0)
    except Exception:
        pass
    return 0


def fetch_osv(name: str) -> list:
    try:
        r = SESSION.post(
            OSV_URL,
            json={"package": {"name": name, "ecosystem": "PyPI"}},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        return [osv_to_cve(v) for v in r.json().get("vulns", [])]
    except Exception as e:
        log.error(f"OSV error ({name}): {e}")
        return []


def fetch_github_advisories(name: str, token: Optional[str]) -> list:
    """Optional enrichment — only runs when GITHUB_TOKEN is present."""
    if not token:
        return []
    query = """
    query($pkg: String!) {
      securityVulnerabilities(first: 20, ecosystem: PIP, package: $pkg,
                              orderBy: {field: UPDATED_AT, direction: DESC}) {
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
        r = SESSION.post(
            GH_GRAPHQL,
            json={"query": query, "variables": {"pkg": name}},
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        nodes = (
            r.json()
             .get("data", {})
             .get("securityVulnerabilities", {})
             .get("nodes", [])
        )
        results = []
        for node in nodes:
            adv = node.get("advisory", {})
            if not adv.get("ghsaId"):
                continue
            sev = normalise_severity(adv.get("severity", "MEDIUM"))
            published = adv.get("publishedAt", "")
            results.append({
                "id":       adv["ghsaId"],
                "severity": sev,
                "score":    adv.get("cvss", {}).get("score") or severity_to_score(sev),
                "desc":     (adv.get("summary") or "")[:300],
                "year":     int(published[:4]) if published else datetime.now().year,
                "refs":     [r["url"] for r in adv.get("references", []) if r.get("url")][:3],
            })
        return results
    except Exception as e:
        log.error(f"GitHub Advisory error ({name}): {e}")
        return []


# ── Blast radius BFS ──────────────────────────────────────────────────────────

def recompute_blast_radii(packages: list) -> None:
    """
    BFS on reversed dependency graph.
    blast_radius.total_affected = packages that transitively depend on this one.
    Mutates packages in-place.
    """
    pkg_ids = {p["id"] for p in packages}

    dependents: dict[str, set] = {p["id"]: set() for p in packages}
    for pkg in packages:
        for dep in pkg.get("deps", []):
            if dep in pkg_ids:
                dependents[dep].add(pkg["id"])

    for pkg in packages:
        visited  = set()
        frontier = {pkg["id"]}
        depth    = 0

        while frontier:
            next_frontier = set()
            for node in frontier:
                if node in visited:
                    continue
                visited.add(node)
                next_frontier.update(dependents.get(node, set()) - visited)
            if next_frontier:
                depth += 1
            frontier = next_frontier

        pkg["blast_radius"] = {
            "total_affected": len(visited) - 1,
            "cascade_depth":  depth,
        }


#  New package builder

def build_new_package(pkg_id: str, info: dict, cves: list, known_ids: set) -> dict:
    group, needs_review = infer_group(info)

    raw_deps = info.get("requires_dist") or []
    deps = list(dict.fromkeys(
        parsed
        for raw in raw_deps
        if "extra ==" not in raw
        for parsed in [parse_dep_name(raw)]
        if parsed and parsed != pkg_id and parsed in known_ids
    ))[:15]

    pkg = {
        "id":           pkg_id,
        "label":        humanize_label(pkg_id),
        "group":        group,
        "downloads":    0,
        "version":      info.get("version", ""),
        "maintainer":   info.get("maintainer") or info.get("author") or "Unknown",
        "license":      info.get("license") or "",
        "description":  (info.get("summary") or "")[:200],
        "deps":         deps,
        "cves":         cves,
        "risk_score":   0,           # manual curation required
        "blast_radius": {"total_affected": 0, "cascade_depth": 0},
        "last_updated": now_iso(),
    }

    if needs_review:
        pkg["needs_review"] = True

    return pkg


#  Update existing package (non-destructive)

def update_existing(pkg: dict, info: dict, fresh_cves: list) -> list[str]:
    """Update only non-curated fields. Returns list of human-readable changes."""
    changes = []

    new_ver = info.get("version", "")
    if new_ver and new_ver != pkg.get("version"):
        pkg["version"] = new_ver
        changes.append(f"version→{new_ver}")

    if pkg.get("maintainer") in ("", "Unknown", None):
        new_maint = info.get("maintainer") or info.get("author") or ""
        if new_maint and new_maint != "Unknown":
            pkg["maintainer"] = new_maint
            changes.append(f"maintainer→{new_maint}")

    merged, added = merge_cves(pkg.get("cves", []), fresh_cves)
    if added:
        pkg["cves"] = merged
        changes.append(f"+{added} CVE(s)")

    pkg["last_updated"] = now_iso()
    return changes


#  Main 

def run(data_path: Path, new_packages: list, dry_run: bool) -> None:
    log.info(f"Loading {data_path}")
    with open(data_path) as f:
        data = json.load(f)

    packages  = data["packages"]
    pkg_map   = {p["id"]: p for p in packages}
    known_ids = set(pkg_map.keys())

    github_token = os.getenv("GITHUB_TOKEN")
    if github_token:
        log.info("GITHUB_TOKEN present — GitHub Advisory enrichment enabled")
    else:
        log.info("No GITHUB_TOKEN — using PyPI + OSV only")

    stats = {"updated": 0, "cves_added": 0, "pkgs_added": 0, "skipped": 0, "needs_review": 0}

    # 1. Refresh existing packages 
    log.info(f"\nRefreshing {len(packages)} existing packages...")

    for pkg in packages:
        pid = pkg["id"]

        info = fetch_pypi(pid)
        time.sleep(RATE_LIMIT)
        if not info:
            stats["skipped"] += 1
            continue

        downloads = fetch_downloads(pid)
        if downloads:
            pkg["downloads"] = downloads
        time.sleep(RATE_LIMIT)

        fresh_cves  = fetch_osv(pid)
        fresh_cves += fetch_github_advisories(pid, github_token)
        time.sleep(RATE_LIMIT)

        changes = update_existing(pkg, info, fresh_cves)
        if changes:
            log.info(f"  {pid:35} {', '.join(changes)}")
            stats["updated"] += 1
            for c in changes:
                if c.startswith("+") and "CVE" in c:
                    stats["cves_added"] += int(c.split("+")[1].split()[0])

    # 2. Add new packages ───────────────────────────────────────────────────
    if new_packages:
        log.info(f"\nProcessing {len(new_packages)} new package(s)...")

        for pid in new_packages:
            pid = pid.strip().lower()

            if pid in pkg_map:
                log.info(f"  {pid}: already exists — skipping")
                continue

            info = fetch_pypi(pid)
            time.sleep(RATE_LIMIT)
            if not info:
                log.warning(f"  {pid}: not found on PyPI — skipping")
                continue

            if not is_ai_ml_relevant(info):
                log.warning(f"  {pid}: doesn't appear AI/ML relevant — skipping")
                continue

            downloads   = fetch_downloads(pid)
            time.sleep(RATE_LIMIT)
            fresh_cves  = fetch_osv(pid)
            fresh_cves += fetch_github_advisories(pid, github_token)
            time.sleep(RATE_LIMIT)

            new_pkg = build_new_package(pid, info, fresh_cves, known_ids | {pid})
            new_pkg["downloads"] = downloads

            packages.append(new_pkg)
            pkg_map[pid]  = new_pkg
            known_ids.add(pid)

            flag = " ⚑ needs_review" if new_pkg.get("needs_review") else ""
            log.info(f"  Added {pid:35} group={new_pkg['group']}{flag}  cves={len(fresh_cves)}")
            stats["pkgs_added"]  += 1
            stats["cves_added"]  += len(fresh_cves)
            if new_pkg.get("needs_review"):
                stats["needs_review"] += 1

    # 3. Recompute blast radii ──────────────────────────────────────────────
    log.info("\nRecomputing blast radii...")
    recompute_blast_radii(packages)

    # 4. Update metadata
    data["metadata"].update({
        "total_packages":    len(packages),
        "total_cves":        sum(len(p.get("cves", [])) for p in packages),
        "last_refreshed":    now_iso(),
        "new_cves_this_run": stats["cves_added"],
    })

    # 5. Write 
    if dry_run:
        log.info("\nDRY RUN — no file written")
    else:
        with open(data_path, "w") as f:
            json.dump(data, f, indent=2)
        log.info(f"\nWritten → {data_path}")

    log.info(
        f"\nSummary: {stats['updated']} refreshed | "
        f"+{stats['cves_added']} CVEs | "
        f"+{stats['pkgs_added']} new packages"
        + (f" ({stats['needs_review']} need group review)" if stats["needs_review"] else "")
        + (f" | {stats['skipped']} skipped" if stats["skipped"] else "")
    )


# ── CLI ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Additive-only updater for rawData.json"
    )
    parser.add_argument(
        "--data",
        default="src/data/rawData.json",
        help="Path to data file (default: src/data/rawData.json)",
    )
    parser.add_argument(
        "--add",
        nargs="*",
        metavar="PKG",
        help="New PyPI package names to add e.g. --add llmguard presidio-analyzer",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and log all changes without writing to disk",
    )
    args = parser.parse_args()

    run(
        data_path    = Path(args.data),
        new_packages = args.add or [],
        dry_run      = args.dry_run,
    )