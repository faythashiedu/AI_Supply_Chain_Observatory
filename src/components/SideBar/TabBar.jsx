export default function TabBar({ activeTab, setActiveTab, cveCount }) {
  const tabs = [
    { id: "overview",  label: "Overview" },
    { id: "cves",      label: `CVEs (${cveCount})` },
    { id: "blast",     label: "Blast" },
    { id: "incidents", label: "Incidents" },
  ];

  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider border-b-2 cursor-pointer bg-transparent transition-colors
            ${activeTab === tab.id
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-muted hover:text-dim"
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}