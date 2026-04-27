import { useState, useRef, useEffect } from "react";
import { GROUP_LABELS, GROUP_COLORS, PACKAGES, ATTACK_PATHS } from "../data/constants";

export default function Header({
  searchQuery, setSearchQuery,
  attackPath, onAttackPath,
  onClear, hasSelection,
  onSearchSelect, onNewsOpen,
}) {
  const [suggestions,     setSuggestions]     = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIdx,      setFocusedIdx]      = useState(-1);
  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);

  const allGroups = [...new Set((PACKAGES || []).map((p) => p.group))].sort();

  function handleSearchChange(e) {
    const q = e.target.value;
    setSearchQuery(q);
    setFocusedIdx(-1);
    if (!q.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    const lower = q.toLowerCase();
    const matched = (PACKAGES || [])
      .filter((p) =>
        p.label?.toLowerCase().includes(lower) ||
        p.id?.toLowerCase().includes(lower) ||
        (p.description || "").toLowerCase().includes(lower)
      ).slice(0, 8);
    setSuggestions(matched);
    setShowSuggestions(matched.length > 0);
  }

  function selectSuggestion(pkg) {
    setSearchQuery(pkg.label || pkg.id);
    setSuggestions([]);
    setShowSuggestions(false);
    if (onSearchSelect) onSearchSelect(pkg);
  }

  function handleKeyDown(e) {
    if (!showSuggestions) return;
    if      (e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setFocusedIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && focusedIdx >= 0) selectSuggestion(suggestions[focusedIdx]);
    else if (e.key === "Escape") { setShowSuggestions(false); setFocusedIdx(-1); }
  }

  useEffect(() => {
    function out(e) {
      if (!dropdownRef.current?.contains(e.target) && !inputRef.current?.contains(e.target))
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", out);
    return () => document.removeEventListener("mousedown", out);
  }, []);

  return (
    <header className="flex items-center gap-3 px-4 py-2 bg-surface border-b border-border flex-shrink-0 flex-wrap">

      {/* Brand */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand to-purple-900 flex items-center justify-center text-sm border border-brand/40">
          ⬡
        </div>
        <span className="font-bold text-[14px] text-primary tracking-tight">AI Supply Chain Observatory</span>
        <span className="text-[10px] text-muted bg-raised px-1.5 py-0.5 rounded font-mono border border-border">Q2 2026</span>
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-44 max-w-64">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-[11px] pointer-events-none font-mono">⌕</span>
        <input
          ref={inputRef}
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="search packages…"
          className="w-full bg-canvas border border-border rounded py-1.5 pl-7 pr-2 text-[11px] text-soft font-mono outline-none focus:border-brand placeholder:text-muted transition-colors"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-2xl z-50 overflow-hidden"
            style={{ boxShadow: "0 8px 32px rgba(124,58,237,0.2)" }}>
            {suggestions.map((pkg, i) => {
              const col = (GROUP_COLORS || {})[pkg.group] || { stroke: "#5a4d7a" };
              return (
                <div key={pkg.id} onMouseDown={() => selectSuggestion(pkg)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${i === focusedIdx ? "bg-brand/20" : "hover:bg-raised"}`}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: col.stroke }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-primary font-mono truncate">{pkg.label}</div>
                    <div className="text-[10px] text-muted truncate">{pkg.group} · v{pkg.version}</div>
                  </div>
                  {pkg.cves?.length > 0 && (
                    <span className="text-[10px] text-critical flex-shrink-0 font-mono">{pkg.cves.length} CVE</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Group filter pills */}
      {/* <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-muted font-mono mr-0.5">filter:</span>
        {allGroups.map((g) => {
          const col    = (GROUP_COLORS || {})[g] || { stroke: "#5a4d7a", fill: "#1a1535" };
          const active = activeGroups.has(g);
          return (
            <button key={g} onClick={() => onToggleGroup && onToggleGroup(g)}
              className="text-[10px] px-2 py-0.5 rounded-full border cursor-pointer transition-all font-mono"
              style={{
                borderColor: active ? col.stroke : "#2d2454",
                background:  active ? col.fill + "dd" : "transparent",
                color:       active ? col.stroke : "#5a4d7a",
                boxShadow:   active ? `0 0 8px ${col.stroke}40` : "none",
              }}>
              {(GROUP_LABELS || {})[g] || g}
            </button>
          );
        })}
      </div> */}

      {/* Attack paths */}
      <div className="flex items-center gap-1 flex-wrap">
        <div className="text-[10px] px-2 py-1 rounded cursor-pointer transition-all text-white shadow-[0_0_12px_rgba(124,58,237,0.4)] font-mono bg-brand">Attack Paths </div>
        {(ATTACK_PATHS || []).map((ap) => (
          <button key={ap.id} onClick={() => onAttackPath && onAttackPath(ap)}
            className={`text-[10px] px-2 py-1 rounded border cursor-pointer transition-all font-mono ${
              attackPath?.id === ap.id
                ? "bg-brand border-brand text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                : "bg-transparent border-border text-muted hover:border-brand hover:text-brand-lt"
            }`}>
            {ap.label}
          </button>
        ))}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button onClick={() => onNewsOpen && onNewsOpen()} title="Latest AI/ML News"
          className="text-[12px] px-2 py-1 bg-canvas border border-border rounded hover:border-brand cursor-pointer transition-colors font-mono text-muted hover:text-brand-lt">
          📡
        </button>
        {hasSelection && (
          <button onClick={() => onClear && onClear()}
            className="text-[10px] px-2 py-1 bg-canvas border border-border rounded text-muted hover:text-soft cursor-pointer font-mono transition-colors">
            ✕ clear
          </button>
        )}
      </div>
    </header>
  );
}