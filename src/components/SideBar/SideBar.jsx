import { PACKAGES, INCIDENTS, riskScore, riskLabel } from "../../data/constants";
import BlastTab from "./BlastTab";
import CVEsTab from "./CVEsTab";
import IncidentsTab from "./IncidentsTab";
import NodeHeader from "./NodeHeader";
import OverviewTab from "./OverviewTab";
import TabBar from "./TabBar";
// import NodeHeader   from "./sidebar/NodeHeader";
// import TabBar       from "./sidebar/TabBar";
// import OverviewTab  from "./sidebar/OverviewTab";
// import CVEsTab      from "./sidebar/CVEsTab";
// import BlastTab     from "./sidebar/BlastTab";
// import IncidentsTab from "./sidebar/IncidentsTab";

export default function Sidebar({
  selectedNode, onNodeClick,
  blastResult, simWave, simRunning,
  onRunBlast, onResetBlast,
  activeTab, setActiveTab,
}) {
  const pkg = selectedNode;
  const pkgIncidents = pkg
    ? INCIDENTS.filter((i) => i.package === pkg.id || pkg.incidents.includes(i.id))
    : [];

  // ── Default (no selection) ────────────────────────────────────────────────
  if (!pkg) {
    return (
      <aside className="w-80 bg-surface border-l border-border flex flex-col overflow-hidden flex-shrink-0">
        <div className="p-4 flex-1 overflow-y-auto sidebar-scroll">
          <div className="mb-4">
            <div className="text-[13px] font-semibold text-primary mb-2">Click any node to inspect</div>
            <div className="text-[11px] text-muted leading-relaxed">
              Explore {PACKAGES.length} real AI/ML packages, their CVEs, dependency chains,
              and {INCIDENTS.length} documented supply chain incidents.
            </div>
          </div>

          {/* Top risk list */}
          <div className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-2">
            Top Risk Packages
          </div>
          {[...PACKAGES]
            .sort((a, b) => riskScore(b) - riskScore(a))
            .slice(0, 8)
            .map((p) => {
              const rs = riskScore(p);
              const rl = riskLabel(rs);
              return (
                <div
                  key={p.id}
                  onClick={() => onNodeClick(p)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md mb-1 cursor-pointer bg-card hover:bg-subtle transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-muted flex-shrink-0" />
                  <span className="flex-1 text-[12px] text-soft">{p.label}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ color: rl.color, background: rl.color + "22" }}
                  >
                    {rs}
                  </span>
                </div>
              );
            })}

          {/* Recent incidents */}
          <div className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-2 mt-4">
            Recent Incidents
          </div>
          {INCIDENTS.slice(0, 4).map((inc) => {
            const borderColor =
              inc.severity === "CRITICAL" ? "#ef4444" :
              inc.severity === "HIGH"     ? "#f97316" : "#eab308";
            return (
              <div
                key={inc.id + inc.date}
                className="p-2 bg-card rounded-md mb-1.5 border-l-2"
                style={{ borderLeftColor: borderColor }}
              >
                <div className="text-[11px] font-semibold text-primary">{inc.title}</div>
                <div className="text-[10px] text-muted mt-0.5">{inc.date} · {inc.package}</div>
              </div>
            );
          })}
        </div>
      </aside>
    );
  }

  // ── Selected node ─────────────────────────────────────────────────────────
  return (
    <aside className="w-80 bg-surface border-l border-border flex flex-col overflow-hidden flex-shrink-0">
      <NodeHeader pkg={pkg} />
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} cveCount={pkg.cves.length} />

      <div className="flex-1 overflow-y-auto sidebar-scroll p-3.5">
        {activeTab === "overview" && (
          <OverviewTab pkg={pkg} onDepClick={onNodeClick} incidentCount={pkgIncidents.length} />
        )}
        {activeTab === "cves" && <CVEsTab cves={pkg.cves} />}
        {activeTab === "blast" && (
          <BlastTab
            pkg={pkg}
            blastResult={blastResult}
            simWave={simWave}
            simRunning={simRunning}
            onRun={() => onRunBlast(pkg.id)}
            onReset={onResetBlast}
            onPkgClick={onNodeClick}
          />
        )}
        {activeTab === "incidents" && <IncidentsTab incidents={pkgIncidents} />}
      </div>
    </aside>
  );
}