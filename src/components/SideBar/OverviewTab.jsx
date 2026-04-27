import { PACKAGES, EDGES, riskScore, riskLabel, fmtDownloads } from "../../data/constants";

export default function OverviewTab({ pkg, onDepClick, incidentCount }) {
  const risk = riskScore(pkg);
  const rl   = riskLabel(risk);
  const dependentCount = EDGES.filter((e) => e.target === pkg.id).length;

  const metrics = [
    { label: "Downloads",    val: fmtDownloads(pkg.downloads) },
    { label: "Dependencies", val: pkg.deps.length },
    { label: "Dependents",  val: dependentCount },
    { label: "Incidents",   val: incidentCount },
  ];

  return (
    <div>
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-2 mb-3.5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card rounded-md px-2.5 py-2">
            <div className="text-base font-bold text-primary">{m.val}</div>
            <div className="text-[10px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Risk bar */}
      <div className="mb-3.5">
        <div className="flex justify-between mb-1">
          <span className="text-[11px] text-dim">Risk Score</span>
          <span className="text-[11px]" style={{ color: rl.color }}>{risk}/100</span>
        </div>
        <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${risk}%`,
              background: "linear-gradient(90deg,#22c55e,#eab308,#ef4444)",
            }}
          />
        </div>
      </div>

      {/* Dep chips */}
      <div className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-1.5">
        Direct Dependencies
      </div>
      <div className="flex flex-wrap gap-1">
        {pkg.deps.length === 0 ? (
          <span className="text-[11px] text-muted">No tracked dependencies</span>
        ) : (
          pkg.deps.map((dep) => {
            const dp = PACKAGES.find((p) => p.id === dep);
            return (
              <span
                key={dep}
                onClick={() => dp && onDepClick(dp)}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  dp
                    ? "bg-subtle border-border/60 text-soft cursor-pointer hover:border-indigo-500"
                    : "bg-[#111118] border-border/20 text-muted cursor-default"
                }`}
              >
                {dp ? dp.label : dep}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}