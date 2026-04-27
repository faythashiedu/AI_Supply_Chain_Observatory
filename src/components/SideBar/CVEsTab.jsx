import { SEVERITY_COLOR } from "../../data/constants";

export default function CVEsTab({ cves }) {
  if (cves.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-2xl mb-2">✓</div>
        <div className="text-[13px] text-green-400">No known CVEs</div>
        <div className="text-[11px] text-muted mt-1">Absence of CVEs ≠ absence of risk</div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {cves.map((cve) => (
        <div
          key={cve.id}
          className="p-2.5 bg-card rounded-md border-l-[3px]"
          style={{ borderLeftColor: SEVERITY_COLOR[cve.severity] || "#6b7280" }}
        >
          <div className="flex justify-between items-start gap-1.5 mb-1">
            <span className="text-[11px] font-semibold text-blue-300 font-mono">{cve.id}</span>
            <div className="flex gap-1 flex-shrink-0">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  color: SEVERITY_COLOR[cve.severity],
                  background: SEVERITY_COLOR[cve.severity] + "22",
                }}
              >
                {cve.severity}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 bg-subtle rounded text-dim">
                {cve.score}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-soft/90 leading-relaxed">{cve.desc}</div>
          <div className="text-[10px] text-muted mt-1">Disclosed {cve.year}</div>
        </div>
      ))}
    </div>
  );
}