import { PACKAGES } from "../../data/constants";

export default function BlastTab({ pkg, blastResult, simWave, simRunning, onRun, onReset, onPkgClick }) {
  return (
    <div>
      <p className="text-[11px] text-dim leading-relaxed mb-3">
        If <strong className="text-primary">{pkg.label}</strong> is compromised, BFS traces
        every package that depends on it — directly or transitively.
      </p>

      {!blastResult ? (
        <button
          onClick={onRun}
          disabled={simRunning}
          className="w-full py-2.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-white text-[13px] font-semibold cursor-pointer transition-colors"
        >
          ▶ Run Blast Radius Simulation
        </button>
      ) : (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-card rounded-md px-2.5 py-2">
              <div className="text-xl font-bold text-red-400">{blastResult.affected.length}</div>
              <div className="text-[10px] text-muted">Total Affected</div>
            </div>
            <div className="bg-card rounded-md px-2.5 py-2">
              <div className="text-xl font-bold text-orange-400">{blastResult.waves.length}</div>
              <div className="text-[10px] text-muted">Cascade Depth</div>
            </div>
          </div>

          <div className="space-y-2">
            {blastResult.waves.map((wave, i) => (
              <div
                key={i}
                className="transition-opacity duration-300"
                style={{ opacity: simWave > i || !simRunning ? 1 : 0.25 }}
              >
                <div className="text-[10px] text-dim mb-1">
                  Wave {i + 1} — {wave.length} package{wave.length !== 1 ? "s" : ""}
                </div>
                <div className="flex flex-wrap gap-1">
                  {wave.map((id) => {
                    const wp = PACKAGES.find((p) => p.id === id);
                    return (
                      <span
                        key={id}
                        onClick={() => wp && onPkgClick(wp)}
                        className={`text-[10px] px-1.5 py-0.5 bg-subtle border border-border/60 rounded text-soft ${wp ? "cursor-pointer hover:border-indigo-500" : ""}`}
                      >
                        {wp ? wp.label : id}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onReset}
            className="w-full mt-3 py-1.5 bg-transparent border border-border/60 rounded-md text-dim text-[11px] cursor-pointer hover:border-indigo-500 transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}