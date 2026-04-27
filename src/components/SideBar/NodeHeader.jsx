import { GROUP_COLORS, GROUP_LABELS, riskScore, riskLabel } from "../../data/constants";

export default function NodeHeader({ pkg }) {
  const risk = riskScore(pkg);
  const rl   = riskLabel(risk);
  const col  = GROUP_COLORS[pkg.group] || GROUP_COLORS.util;

  return (
    <div className="px-3.5 py-3 border-b border-border bg-[#0d0d14]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-bold text-primary">{pkg.label}</div>
          <div className="text-[11px] text-muted mt-0.5">v{pkg.version} · {pkg.maintainer}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold" style={{ color: rl.color }}>{risk}</div>
          <div className="text-[10px]" style={{ color: rl.color }}>{rl.label} Risk</div>
        </div>
      </div>

      <div className="flex gap-1 mt-2 flex-wrap">
        <span
          className="text-[10px] px-1.5 py-0.5 rounded border"
          style={{ background: col.fill + "88", borderColor: col.stroke, color: col.text }}
        >
          {GROUP_LABELS[pkg.group] || pkg.group}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 bg-subtle rounded text-dim">
          {pkg.license}
        </span>
        {pkg.cves.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-red-500 bg-red-500/10 text-red-400">
            {pkg.cves.length} CVE{pkg.cves.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}