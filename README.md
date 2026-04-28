AI supply chain observatory

# AI Supply Chain Observatory

> An interactive security visualization of the AI/ML package ecosystem — built to make supply chain risk visible before it becomes an incident.

![AI Supply Chain Observatory](https://img.shields.io/badge/status-live-brightgreen) ![Packages](https://img.shields.io/badge/packages-130-blue) ![CVEs](https://img.shields.io/badge/CVEs-511-red) ![Incidents](https://img.shields.io/badge/incidents-35-orange)

**[→ Live Demo](https://ai-supply-chain-observatory.vercel.app/)** · **[Report an Issue](https://github.com/faythashiedu/AI_Supply_Chain_Observatory/issues)**



---

## Why This Exists

Every AI application you build sits on top of a deep, largely invisible dependency stack. `torch` pulls in `nvidia-cuda`. `langchain` pulls in `pyyaml`, which has two critical-severity arbitrary code execution CVEs dating back to 2017. The MCP SDK you installed last week connects directly to tools that run on your filesystem.

Most developers know their direct dependencies. Almost no one knows their transitive ones — and that is exactly where supply chain attacks land.

In January 2023, a malicious `torchtriton` package uploaded to public PyPI compromised 2,500+ machines over a holiday weekend, exfiltrating SSH keys and cloud credentials. In September 2023, thousands of AI training clusters were compromised via Ray's unauthenticated dashboard API. In January 2025, researchers demonstrated that malicious MCP tool descriptions could silently hijack Claude and GPT-4o to exfiltrate conversation history.

None of these were zero-days. They were all known, documented, preventable and invisible to most of the teams affected.

The AI Supply Chain Observatory makes this visible.

---

## What It Does

### Interactive Dependency Graph
The core of the app is a force-directed graph of 103 real AI/ML packages across 12 architectural layers — from hardware and CUDA all the way up to agent frameworks and the MCP tool layer. Every edge is a real dependency relationship. Node size reflects monthly download volume. The outer ring reflects risk score.

### 12-Layer Supply Chain Architecture
The graph is organized into the actual layers of a modern AI stack:

| Layer | Description | Examples |
|---|---|---|
| Hardware & Compute | GPU drivers, CUDA bindings | CUDA, PyCUDA, nvidia-ml-py |
| Core Scientific | Foundational numerical libraries | NumPy, Pandas, SciPy |
| ML Frameworks | Training and inference engines | PyTorch, TensorFlow, JAX, Keras |
| AI Libraries | Model hubs and training utilities | Transformers, Diffusers, PEFT, Accelerate |
| Vector Databases | Embedding storage and retrieval | ChromaDB, Pinecone, Qdrant, FAISS |
| AI Tooling | Tokenization, serialization, quantization | tiktoken, safetensors, ONNX, bitsandbytes |
| Provider SDKs | API clients for LLM providers | OpenAI, Anthropic, Cohere, LiteLLM |
| Serving & Infra | Model serving and deployment | Ray, vLLM, Ollama, Gradio, Triton |
| Agent Frameworks | Orchestration and reasoning | LangChain, LlamaIndex, CrewAI, AutoGen |
| MCP & Tool Layer | Model Context Protocol servers | MCP SDK, official MCP servers, agent adapters |
| Utilities | Networking, serialization, auth | requests, pydantic, PyYAML, cryptography |
| Applications | Experiment tracking, deployment platforms | MLflow, W&B, BentoML |

### CVE Data — Real, Not Synthetic
475 documented CVEs pulled from PyPI, OSV.dev, GitHub Security Advisories, and NVD. Each CVE includes severity rating, CVSS score where available, description, disclosure year, and source links. Click any node → open the CVEs tab to see everything affecting that package.

### Blast Radius Simulation
Select any package and run a BFS (breadth-first search) cascade simulation to see exactly which packages would be affected if that package were compromised. The simulation animates wave by wave — direct dependents first, then their dependents, out to the full transitive closure.

### 17 Real-World Incidents
A hand-curated timeline of documented supply chain attacks and security incidents from 2019 to 2026 — each with full write-up, affected package count, and remediation guidance. Incidents are plotted chronologically in the scrollable footer timeline. Click any dot to navigate directly to the affected package.

### Attack Path Simulation
Five pre-built attack chains that animate across the graph to show how real-world compromise scenarios propagate.

### Live News Feed
The 📡 button in the header pulls a live RSS feed of AI and security news from The Hacker News and VentureBeat — so you can cross-reference what's happening in the news with what's in your stack.

---

## Who This Is For

**AI/ML Engineers** building production systems who want to understand the security posture of their stack before shipping.

**Security Engineers** conducting threat modeling or risk assessments on AI-powered applications.

**AppSec Teams** who need a visual entry point into the AI dependency surface before diving into SBOMs and scanner output.

**Researchers** studying supply chain security in the AI/ML ecosystem — particularly the emerging MCP and agent attack surface.

**Engineering Leaders** who need to communicate supply chain risk to stakeholders without a wall of CVE IDs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Graph Visualization | D3.js v7 (force simulation) |
| Styling | Tailwind CSS v3 |
| Build Tool | Vite |
| Data | Static JSON (PyPI + OSV.dev scraper) |


---

## Contributing

Contributions welcome — especially:
- Additional incident write-ups with remediation guidance
- Corrections to CVE data or package metadata
- New attack path presets
- Data scraper improvements

Open an issue or PR.

---

## License

MIT

last data
/** 
 * Supply Chain Data for AI Core Layer
 * Updated on: 2026-04-25T14:46:30.000000
 * Total Packages: 39
 * Total CVEs: 441
 * Average Risk Score: 45.2
 * Most Common License: MIT
 * Most Common Dependency: pydantic
 */
