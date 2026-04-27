import { useRef } from "react";
import { GROUP_COLORS, GROUP_LABELS, PACKAGES } from "../data/constants";
import { useForceGraph } from "../hooks/useForceGraph";

/**
 * GraphCanvas
 *
 * Props:
 *   onNodeClick      fn(pkg)
 *   highlightedNodes React.MutableRefObject<Set<string>>
 *   simulatingNode   React.MutableRefObject<string|null>
 *   attackPath       object | null
 *   packages         array
 */
export default function GraphCanvas({
  onNodeClick,
  highlightedNodes,
  simulatingNode,
  attackPath,
  activeGroups,
  packages,
}) {
  const svgRef = useRef(null);

  // D3 mounts into the SVG element
  useForceGraph(svgRef, onNodeClick, highlightedNodes, simulatingNode, activeGroups);
 
  return (
    <div className="relative flex-1 overflow-hidden bg-canvas">
      {/* D3 renders into this SVG */}
      <svg
        ref={svgRef}
        className="w-full h-full"
      />

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-black/85 border border-border rounded-lg p-2">
        <p className="text-[9px] text-muted uppercase tracking-wider mb-1">
          Click nodes to explore packages | Pinch to zoom and drag to pan.
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(GROUP_COLORS).map(([g, c]) => (
            <div key={g} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: c.fill, border: `1px solid ${c.stroke}` }}
              />
              <span className="text-[9px] text-dim">{GROUP_LABELS[g]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Attack path overlay */}
      {attackPath && (
        <div className="absolute top-2 left-2 bg-purple-900/20 border border-purple-600 rounded-lg p-3 max-w-xs">
          <p className="text-[11px] font-semibold text-purple-300 mb-1">
            ⚡ {attackPath.label}
          </p>
          <p className="text-[10px] text-purple-400 mb-2">{attackPath.desc}</p>
          <div className="flex items-center flex-wrap gap-1">
            {attackPath.steps.map((s, i) => {
              const pkg = packages.find((p) => p.id === s);
              return (
                <span key={s} className="flex items-center gap-1">
                  <span className="text-[10px] text-soft bg-subtle px-1.5 py-0.5 rounded">
                    {pkg?.label || s}
                  </span>
                  {i < attackPath.steps.length - 1 && (
                    <span className="text-purple-600 text-[10px]">→</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}