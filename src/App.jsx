import { useState, useRef, useCallback, useEffect } from "react";
import { PACKAGES, ATTACK_PATHS, computeBlastRadius } from "./data/constants";
import Header from "./components/Header";
import StatsBar from "./components/StatsBar";
import GraphCanvas from "./components/GraphCanvas";
import Sidebar from "./components/SideBar/SideBar";
import Timeline from "./components/Timeline";
import NewsModal from "./components/NewsModal";
 

function App() {
  const highlightedNodes = useRef(new Set());
  const simulatingNode   = useRef(null);
  const activeGroupsRef  = useRef(new Set()); // for group filter highlight

  //mobile state
  const [headerOpen,    setHeaderOpen]    = useState(false);  // mobile header drawer
  const [sidebarOpen,   setSidebarOpen]   = useState(false);  // mobile sidebar sheet
  const [isMobile,      setIsMobile]      = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
 
  // ── React state ───────────────────────────────────────────────────────────
  const [selectedNode,  setSelectedNode]  = useState(null);
  const [activeTab,     setActiveTab]     = useState("overview");
  const [blastResult,   setBlastResult]   = useState(null);
  const [simWave,       setSimWave]       = useState(-1);
  const [simRunning,    setSimRunning]    = useState(false);
  const [attackPath,    setAttackPath]    = useState(null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [activeGroups,  setActiveGroups]  = useState(new Set()); // UI state (drives ref)
  const [showNews,      setShowNews]      = useState(false);
 
  // Show news modal on first visit
  useEffect(() => {
    const seen = sessionStorage.getItem("news-seen");
    if (!seen) {
      setShowNews(true);
      sessionStorage.setItem("news-seen", "1");
    }
  }, []);
 
  // Keep ref in sync with state so the D3 tick loop can read it without React
  useEffect(() => {
    activeGroupsRef.current = activeGroups;
  }, [activeGroups]);
 
  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((pkg) => {
    setSelectedNode(pkg);
    setBlastResult(null);
    setSimWave(-1);
    setSimRunning(false);
    setActiveTab("overview");
    simulatingNode.current   = null;
    highlightedNodes.current = new Set([pkg.id, ...(pkg.deps || [])]);
    if (isMobile) setSidebarOpen(true); // auto-open sidebar on mobile when node clicked
  }, [isMobile]);
 
  function handleSearchSelect(pkg) {
    handleNodeClick(pkg);
    setSearchQuery(pkg.label);
  }
 
  // function handleToggleGroup(group) {
  //   setActiveGroups((prev) => {
  //     const next = new Set(prev);
  //     next.has(group) ? next.delete(group) : next.add(group);
  //     return next;
  //   });
  //   highlightedNodes.current = new Set();
  //   simulatingNode.current   = null;
  //   setSelectedNode(null);
  //   setAttackPath(null);
  // }
 
  function handleClear() {
    setSelectedNode(null);
    setBlastResult(null);
    setSimWave(-1);
    setSimRunning(false);
    setAttackPath(null);
    setActiveGroups(new Set());
    setSearchQuery("");
    simulatingNode.current   = null;
    highlightedNodes.current = new Set();
    activeGroupsRef.current  = new Set();
  }
 
  function handleRunBlast(pkgId) {
    if (simRunning) return;
    const result = computeBlastRadius(pkgId);
    setBlastResult(result);
    setSimWave(0);
    setSimRunning(true);
    simulatingNode.current   = pkgId;
    highlightedNodes.current = new Set([pkgId]);
 
    let wave = 0;
    const iv = setInterval(() => {
      wave++;
      if (wave > result.waves.length) {
        clearInterval(iv);
        setSimRunning(false);
        highlightedNodes.current = new Set([pkgId, ...result.affected]);
        return;
      }
      setSimWave(wave);
      highlightedNodes.current = new Set([pkgId, ...result.waves.slice(0, wave).flat()]);
    }, 600);
  }
 
  function handleResetBlast() {
    setBlastResult(null);
    setSimWave(-1);
    setSimRunning(false);
    simulatingNode.current   = null;
    highlightedNodes.current = selectedNode
      ? new Set([selectedNode.id, ...(selectedNode.deps || [])])
      : new Set();
  }
 
  function handleAttackPath(path) {
    // Toggle off if already active
    if (attackPath?.id === path.id) { handleClear(); return; }
 
    setAttackPath(path);
    setBlastResult(null);
    setSelectedNode(null);
    setActiveGroups(new Set());
    activeGroupsRef.current  = new Set();
    if (isMobile) setHeaderOpen(false);
 
    // Animate through steps on the graph
    highlightedNodes.current = new Set([path.steps[0]]);
    simulatingNode.current   = path.steps[0];
 
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i >= path.steps.length) { clearInterval(iv); simulatingNode.current = null; return; }
      highlightedNodes.current = new Set(path.steps.slice(0, i + 1));
      simulatingNode.current   = path.steps[i];
    }, 900);
  }
 
  function handleIncidentClick(pkg) {
    handleNodeClick(pkg);
    setActiveTab("incidents");
  }
 
  const hasSelection = !!selectedNode || !!attackPath || activeGroups.size > 0;
 
 
  return (
    <div className="flex flex-col h-screen bg-canvas text-soft overflow-hidden">
 
      {/* ── Desktop header ── */}
      {!isMobile && (
        <Header
          searchQuery={searchQuery}   setSearchQuery={setSearchQuery}
          attackPath={attackPath}     onAttackPath={handleAttackPath}
          onClear={handleClear}       hasSelection={hasSelection}
          onSearchSelect={handleSearchSelect}
          onNewsOpen={() => setShowNews(true)}
        />
      )}
 
      {/* ── Mobile top bar ── */}
      {isMobile && (
        <div className="flex items-center justify-between px-3 py-2 bg-surface border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-brand to-purple-900 flex items-center justify-center text-xs border border-brand/40">⬡</div>
            <span className="font-bold text-[13px] text-primary font-mono">AI Supply Chain</span>
          </div>
          <div className="flex items-center gap-2">
            {hasSelection && (
              <button onClick={handleClear} className="text-[10px] px-2 py-1 bg-canvas border border-border rounded text-muted font-mono">✕</button>
            )}
            <button onClick={() => setShowNews(true)} className="text-[12px] px-2 py-1 bg-canvas border border-border rounded text-muted">📡</button>
            <button
              onClick={() => setHeaderOpen((v) => !v)}
              className="text-[12px] px-2 py-1 bg-canvas border border-border rounded text-muted font-mono"
            >
              {headerOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      )}
 
      {/* ── Mobile header drawer ── */}
      {isMobile && headerOpen && (
        <div className="bg-surface border-b border-border flex-shrink-0 p-3 space-y-2">
          <Header
            searchQuery={searchQuery}   setSearchQuery={setSearchQuery}
            attackPath={attackPath}     onAttackPath={(p) => { handleAttackPath(p); setHeaderOpen(false); }}
            onClear={handleClear}       hasSelection={hasSelection}
            onSearchSelect={(p) => { handleSearchSelect(p); setHeaderOpen(false); }}
            onNewsOpen={() => { setShowNews(true); setHeaderOpen(false); }}
            mobileDrawer
          />
        </div>
      )}
 
      <StatsBar />
 
      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden relative">
        <GraphCanvas
          onNodeClick={handleNodeClick}
          highlightedNodes={highlightedNodes}
          simulatingNode={simulatingNode}
          activeGroupsRef={activeGroupsRef}
          attackPath={attackPath}
          packages={PACKAGES}
        />
 
        {/* Desktop sidebar — always visible */}
        {!isMobile && (
          <Sidebar
            selectedNode={selectedNode}   onNodeClick={handleNodeClick}
            blastResult={blastResult}     simWave={simWave}
            simRunning={simRunning}       onRunBlast={handleRunBlast}
            onResetBlast={handleResetBlast}
            activeTab={activeTab}         setActiveTab={setActiveTab}
          />
        )}
 
        {/* Mobile sidebar — bottom sheet */}
        {isMobile && selectedNode && (
          <>
            {/* Backdrop */}
            {sidebarOpen && (
              <div className="absolute inset-0 bg-black/50 z-30"
                onClick={() => setSidebarOpen(false)} />
            )}
            {/* Sheet */}
            <div className={`absolute bottom-0 left-0 right-0 z-40 bg-surface border-t border-border rounded-t-xl transition-transform duration-300 ${sidebarOpen ? "translate-y-0" : "translate-y-full"}`}
              style={{ maxHeight: "75vh", display: "flex", flexDirection: "column" }}>
              {/* Drag handle + close */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 bg-border rounded-full mx-auto" />
              </div>
              <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
                <span className="text-[12px] font-mono text-primary font-semibold">{selectedNode.label}</span>
                <button onClick={() => setSidebarOpen(false)} className="text-muted text-lg font-mono">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar
                  selectedNode={selectedNode}   onNodeClick={(p) => { handleNodeClick(p); }}
                  blastResult={blastResult}     simWave={simWave}
                  simRunning={simRunning}       onRunBlast={handleRunBlast}
                  onResetBlast={handleResetBlast}
                  activeTab={activeTab}         setActiveTab={setActiveTab}
                  mobile
                />
              </div>
            </div>
 
            {/* Floating button to reopen sheet */}
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="absolute bottom-4 right-4 z-30 bg-brand border border-brand/60 rounded-full px-3 py-2 text-[11px] font-mono text-white shadow-lg"
                style={{ boxShadow: "0 0 16px rgba(124,58,237,0.4)" }}
              >
                {selectedNode.label} ↑
              </button>
            )}
          </>
        )}
      </div>
 
      {/* Timeline — hidden on very small screens */}
      <div className="hidden sm:block">
        <Timeline onIncidentClick={handleIncidentClick} />
      </div>
 
      {showNews && <NewsModal onClose={() => setShowNews(false)} />}
    </div>
  )
}

export default App
