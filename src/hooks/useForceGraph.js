import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { PACKAGES, EDGES, GROUP_COLORS } from "../data/constants";
import { riskScore, riskLabel, fmtDownloads } from "../data/constants";

const HARDWARE_R = 30;
const MIN_R      = 20;
const MAX_R      = 40;

function nodeRadius(pkg) {
  if (pkg.group === "hardware") return HARDWARE_R;
  const dl = pkg.downloads || 0;
  if (dl <= 0) return MIN_R;
  const logMin = Math.log10(100_000);
  const logMax = Math.log10(9_000_000_000);
  const t = Math.min(1, Math.max(0, (Math.log10(Math.max(dl, 100_000)) - logMin) / (logMax - logMin)));
  return MIN_R + t * (MAX_R - MIN_R);
}

export function useForceGraph(svgRef, onNodeClick, highlightedNodes, simulatingNode, activeGroupsRef) {
  const frameRef = useRef(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const W = svgEl.clientWidth  || 900;
    const H = svgEl.clientHeight || 600;

    const svg = d3.select(svgEl).attr("width", W).attr("height", H);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");

    defs.append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 16).attr("refY", 0)
      .attr("markerWidth", 5).attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", "#3d2b6b");

    const glowFilter = defs.append("filter")
      .attr("id", "node-glow")
      .attr("x", "-80%").attr("y", "-80%")
      .attr("width", "260%").attr("height", "260%");
    glowFilter.append("feGaussianBlur")
      .attr("in", "SourceGraphic")
      .attr("stdDeviation", "6")
      .attr("result", "blur");
    const fm = glowFilter.append("feMerge");
    fm.append("feMergeNode").attr("in", "blur");
    fm.append("feMergeNode").attr("in", "blur");
    fm.append("feMergeNode").attr("in", "SourceGraphic");

    const container = svg.append("g");
    svg.call(d3.zoom().scaleExtent([0.15, 4]).on("zoom", (e) => container.attr("transform", e.transform)));

    // ── Data ─────────────────────────────────────────────────────────────────
    const nodes   = PACKAGES.map((pkg) => ({ ...pkg, r: nodeRadius(pkg) }));
    const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const links   = EDGES
      .map((e) => ({ source: nodeById[e.source], target: nodeById[e.target] }))
      .filter((e) => e.source && e.target);

    // ── Simulation ───────────────────────────────────────────────────────────
    const sim = d3.forceSimulation(nodes)
      .force("link",    d3.forceLink(links).id((d) => d.id)
        .distance((d) => 90 + d.source.r + d.target.r).strength(0.25))
      .force("charge",  d3.forceManyBody().strength(-520))
      .force("center",  d3.forceCenter(W / 2, H / 2).strength(0.04))
      .force("collide", d3.forceCollide().radius((d) => d.r + 22).strength(0.9))
      .alphaDecay(0.012);

    // ── Links ────────────────────────────────────────────────────────────────
    const linkSel = container.append("g")
      .selectAll("line").data(links).join("line")
      .attr("stroke", "#2d1f52")
      .attr("stroke-width", 0.8)
      .attr("stroke-opacity", 0.5)
      .attr("marker-end", "url(#arrow)")
      .style("pointer-events", "none");

    // ── Node groups ──────────────────────────────────────────────────────────
    const nodeSel = container.append("g")
      .selectAll("g").data(nodes).join("g")
      .attr("cursor", "pointer")
      .call(
        d3.drag()
          .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end",   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on("click", (e, d) => {
        e.stopPropagation();
        onNodeClick(PACKAGES.find((p) => p.id === d.id) || d);
      });
      const haloSel = nodeSel.append("circle")
      .attr("class", "node-halo")
      .attr("r",      (d) => d.r + 4)
      .attr("fill",   (d) => (GROUP_COLORS[d.group] || GROUP_COLORS.util).glow)
      .attr("opacity", 0.3)
      .attr("filter", "url(#node-glow)")
      .style("pointer-events", "none");
    // Base circle
    const circSel = nodeSel.append("circle")
      .attr("r",            (d) => d.r)
      .attr("fill",         (d) => (GROUP_COLORS[d.group] || GROUP_COLORS.util).fill)
      .attr("stroke",       (d) => (GROUP_COLORS[d.group] || GROUP_COLORS.util).stroke)
      .attr("stroke-width", 1.5);

    // Risk arc (SVG path drawn once per node)
    nodeSel.each(function(d) {
      const rs = riskScore(d);
      if (rs <= 0) return;
      const rl = riskLabel(rs);
      const r  = d.r + 3.5;
      const ang = (rs / 100) * 2 * Math.PI;
      const x1 = r * Math.cos(-Math.PI / 2);
      const y1 = r * Math.sin(-Math.PI / 2);
      const x2 = r * Math.cos(-Math.PI / 2 + ang);
      const y2 = r * Math.sin(-Math.PI / 2 + ang);
      d3.select(this).append("path")
        .attr("class", "risk-arc")
        .attr("d", `M ${x1} ${y1} A ${r} ${r} 0 ${ang > Math.PI ? 1 : 0} 1 ${x2} ${y2}`)
        .attr("fill", "none")
        .attr("stroke", rl.color)
        .attr("stroke-width", 2)
        .attr("stroke-linecap", "round")
        .style("pointer-events", "none");
    });

    // CVE badge
    nodeSel.filter((d) => d.cves?.length > 0)
      .append("circle")
      .attr("cx", (d) =>  d.r * 0.7).attr("cy", (d) => -d.r * 0.7)
      .attr("r", 7)
      .attr("fill", "#ff1744").attr("stroke", "#07050f").attr("stroke-width", 0.5)
      .style("pointer-events", "none");
    nodeSel.filter((d) => d.cves?.length > 0)
      .append("text")
      .attr("x", (d) =>  d.r * 0.7).attr("y", (d) => -d.r * 0.7 + 0.5)
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .attr("fill", "#fff").attr("font-size", 7).attr("font-weight", "bold")
      .style("pointer-events", "none")
      .text((d) => d.cves.length);

    // Label
    nodeSel.append("text")
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .attr("fill", (d) => (GROUP_COLORS[d.group] || GROUP_COLORS.util).text)
      .attr("font-size", (d) => Math.max(8, Math.min(12, d.r * 0.6)))
      .attr("font-family", "'JetBrains Mono', 'Fira Code', monospace")
      .style("pointer-events", "none")
      .text((d) => {
        const max = Math.floor(d.r / 3);
        return d.label.length > max ? d.label.slice(0, max) + "…" : d.label;
      });

    // ── Tooltip ───────────────────────────────────────────────────────────────
    let tooltip = document.querySelector(".graph-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "graph-tooltip";
      tooltip.style.display = "none";
      svgEl.parentElement.appendChild(tooltip);
    }

    nodeSel
      .on("mouseenter", (e, d) => {
        tooltip.innerHTML = `
          <span style="font-weight:600;color:#e2d9f3">${d.label}</span>
          <span style="color:#7c5cbf;margin:0 4px">·</span>
          <span style="color:#9ca3af;font-size:10px">v${d.version}</span><br/>
          <span style="color:#6b7280;font-size:10px">${fmtDownloads(d.downloads)} dl · ${d.cves?.length || 0} CVEs · risk ${riskScore(d)}</span>
        `;
        tooltip.style.display = "block";
      })
      .on("mousemove", (e) => {
        const rect = svgEl.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - rect.left + 14}px`;
        tooltip.style.top  = `${e.clientY - rect.top  - 10}px`;
      })
      .on("mouseleave", () => { tooltip.style.display = "none"; });

    // ── D3 tick — only moves nodes, does NOT handle opacity ──────────────────
    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
      nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Click SVG background to clear
    svg.on("click", () => {
      highlightedNodes.current = new Set();
      simulatingNode.current   = null;
    });

    // ── Persistent rAF loop — applies highlight/group filter every frame ─────
    // This runs INDEPENDENTLY of the D3 sim so it keeps working after cooling.
    let prevHL    = "";
    let prevSim   = "";
    let prevGroup = "";

    function applyHighlight() {
      const hl       = highlightedNodes.current;
      const simId    = simulatingNode.current;
      const ag       = activeGroupsRef?.current;
      const hasHL    = hl && hl.size > 0;
      const hasGroup = ag && ag.size > 0;

      // Build cache keys to skip unchanged frames
      const hlKey    = (hasHL    ? [...hl].sort().join(",")    : "") + "|" + (simId || "");
      const groupKey = hasGroup ? [...ag].sort().join(",") : "";

      if (hlKey === prevHL && groupKey === prevGroup) {
        frameRef.current = requestAnimationFrame(applyHighlight);
        return;
      }
      prevHL    = hlKey;
      prevGroup = groupKey;

      // Node visibility
      circSel.attr("opacity", (d) => {
        if (hasHL)    return hl.has(d.id) ? 1 : 0.07;
        if (hasGroup) return ag.has(d.group) ? 1 : 0.07;
        return 1;
      });

      

      // Simulating node gets orange glow stroke
      circSel
        .attr("stroke",       (d) => simId === d.id ? "#f97316" : (GROUP_COLORS[d.group] || GROUP_COLORS.util).stroke)
        .attr("stroke-width", (d) => simId === d.id ? 3.5 : 1.5);
     
      // Halo glow — updated every frame to reflect state
      nodeSel.select("circle.node-halo")
        .attr("fill", (d) => {
          if (simId === d.id) return "#f97316";
          return (GROUP_COLORS[d.group] || GROUP_COLORS.util).glow;
        })
        .attr("r", (d) => simId === d.id ? d.r + 8 : d.r + 5)
        .attr("opacity", (d) => {
          if (simId === d.id)               return 0.6;
          if (hasHL && !hl.has(d.id))       return 0;      // dimmed nodes lose halo
          if (hasGroup && !ag.has(d.group)) return 0;
          return 0.45;
        })
        .style("filter", (d) =>
          simId === d.id
            ? `drop-shadow(0 0 10px #f97316)`
            : `drop-shadow(0 0 5px ${(GROUP_COLORS[d.group] || GROUP_COLORS.util).glow})`
        );
      // Text + risk arc opacity
      nodeSel.select("text").attr("opacity", (d) => {
        if (hasHL)    return hl.has(d.id) ? 1 : 0.04;
        if (hasGroup) return ag.has(d.group) ? 1 : 0.04;
        return 0.9;
      });
      nodeSel.selectAll(".risk-arc").attr("opacity", (d) => {
        if (hasHL)    return hl.has(d.id) ? 1 : 0;
        if (hasGroup) return ag.has(d.group) ? 1 : 0;
        return 1;
      });

      // Link visibility
      linkSel
        .attr("stroke", (d) =>
          hasHL && hl.has(d.source.id) && hl.has(d.target.id) ? "#7c3aed" : "#2d1f52"
        )
        .attr("stroke-opacity", (d) => {
          if (hasHL)    return hl.has(d.source.id) && hl.has(d.target.id) ? 0.85 : 0.02;
          if (hasGroup) return ag.has(d.source.group) && ag.has(d.target.group) ? 0.5 : 0.03;
          return 0.45;
        })
        .attr("stroke-width", (d) =>
          hasHL && hl.has(d.source.id) && hl.has(d.target.id) ? 1.5 : 0.8
        );

      frameRef.current = requestAnimationFrame(applyHighlight);
    }

    frameRef.current = requestAnimationFrame(applyHighlight);

    // ── Resize ────────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      svg.attr("width", svgEl.clientWidth).attr("height", svgEl.clientHeight);
    });
    ro.observe(svgEl);

    return () => {
      sim.stop();
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      if (tooltip?.parentNode) tooltip.remove();
    };
  }, []);
}