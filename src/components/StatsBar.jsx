import { PACKAGES, EDGES, INCIDENTS, fmtDownloads, getStats } from "../data/constants";

export default function StatsBar() {
  const { totalCVEs, criticalPkgs, totalDownloads } = getStats();

  const metrics = [
    { label: "Packages",        val: PACKAGES.length,              color: "text-indigo-400" },
    { label: "Dependencies",    val: EDGES.length,                 color: "text-blue-400"   },
    { label: "CVEs",            val: totalCVEs,                    color: "text-orange-400" },
    { label: "Incidents",       val: INCIDENTS.length,             color: "text-red-400"    },
    { label: "Critical Risk",   val: criticalPkgs,                 color: "text-red-600"    },
    { label: "Total Downloads", val: fmtDownloads(totalDownloads), color: "text-green-400"  },
  ];

  return (
    <div className="flex bg-[#0d0d14] border-b border-border flex-shrink-0">
      {metrics.map((m, i) => (
        <div
          key={m.label}
          className={`flex-1 text-center py-1.5 px-1 ${i < metrics.length - 1 ? "border-r border-border" : ""}`}
        >
          <div className={`text-base font-bold ${m.color}`}>{m.val}</div>
          <div className="text-[9px] text-muted uppercase tracking-wide">{m.label}</div>
        </div>
      ))}
    </div>
  );
}