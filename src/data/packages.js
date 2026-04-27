import rawData from "./rawData.json"

export const LAYERS       = rawData.layers;        
export const GROUP_COLORS = rawData.group_colors; 

export const GROUP_LABELS = Object.fromEntries(
  Object.entries(LAYERS).map(([k, v]) => [k, v.name])
);


const allIds = new Set(rawData.packages.map((p) => p.id));

export const PACKAGES = rawData.packages.map((p) => ({
  ...p,
  // Filter deps to only node→node edges (external packages are silently dropped)
  deps: (p.deps ?? []).filter((d) => allIds.has(d)),
  // Ensure cves array always exists
  cves: p.cves ?? [],
  // incidents joined later — initialise as empty if missing
  incidents: p.incidents ?? [],
}));