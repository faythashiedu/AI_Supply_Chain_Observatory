import { SEVERITY_COLOR } from "../../data/constants";

export default function IncidentsTab({ incidents }) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-[11px] text-muted">No documented incidents for this package</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map((inc) => (
        <div
          key={inc.id + inc.date}
          className="p-2.5 bg-card rounded-md border-l-[3px]"
          style={{ borderLeftColor: SEVERITY_COLOR[inc.severity] || "#6b7280" }}
        >
          <div className="flex justify-between gap-1.5 mb-1">
            <span className="text-[11px] font-semibold text-primary">{inc.title}</span>
            <span className="text-[10px] flex-shrink-0" style={{ color: SEVERITY_COLOR[inc.severity] }}>
              {inc.severity}
            </span>
          </div>

          <div className="text-[10px] text-muted mb-1.5">{inc.date} · {inc.type}</div>
          <div className="text-[11px] text-soft/90 leading-relaxed mb-1.5">{inc.desc}</div>

          {inc.affected > 0 && (
            <div className="text-[10px] text-orange-400">
              ~{inc.affected.toLocaleString()} affected
            </div>
          )}

          {inc.remediation && (
            <div className="mt-1.5 px-2 py-1.5 bg-green-950/40 rounded text-[10px] text-green-400">
              💡 {inc.remediation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}