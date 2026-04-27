import { INCIDENTS, PACKAGES, SEVERITY_COLOR } from "../data/constants";

const START = new Date("2019-01-01").getTime();
const END   = new Date("2026-06-01").getTime();
const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

function pct(dateStr) {
  return ((new Date(dateStr).getTime() - START) / (END - START)) * 100;
}

export default function Timeline({ onIncidentClick }) {
  const unique = [...new Map(INCIDENTS.map((i) => [i.id, i])).values()].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  return (
    <footer className="bg-surface border-t border-border px-4 py-2 flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted flex-shrink-0">Timeline</span>

        {/* Track */}
        <div className="flex-1 relative h-8">
          {/* Baseline */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-1/2" />

          {/* Dots */}
          {unique.map((inc) => (
            <div
              key={inc.id}
              title={`${inc.date}: ${inc.title}`}
              onClick={() => {
                const pkg = PACKAGES.find((p) => p.id === inc.package);
                if (pkg) onIncidentClick(pkg);
              }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 2xl:w-3 2xl:h-3 rounded-full cursor-pointer z-10 border border-[#0a0a0f] hover:scale-150 transition-transform"
              style={{
                left: `${pct(inc.date)}%`,
                background: SEVERITY_COLOR[inc.severity] || "#6b7280",
              }}
             
            />
          ))}

          {/* Year labels */}
          {YEARS.map((y) => (
            <span
              key={y}
              className="absolute text-[9px] text-muted/60 -translate-x-1/2"
              style={{ left: `${pct(`${y}-01-01`)}%`, top: "calc(50% + 10px)" }}
            >
              {y}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-2 flex-shrink-0">
          {Object.entries(SEVERITY_COLOR).map(([s, c]) => (
            <div key={s} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-" style={{ background: c }} />
              <span className="text-[9px] text-muted">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}