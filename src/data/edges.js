import { PACKAGES } from "./packages";
 
// Build edge list from pre-filtered deps (only node→node, external deps already stripped)
export const EDGES = PACKAGES.flatMap((pkg) =>
  (pkg.deps ?? []).map((dep) => ({ source: pkg.id, target: dep }))
);
 