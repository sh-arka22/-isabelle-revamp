// Where a node's `file` from dag.json may be opened from. The export is data,
// not code, so a path it names is opened only when it lies under a root the
// user already trusts: the workspace folders, the export's repo root (the
// parent of out/) and ISABELLE_HOME. Symlinks are resolved first, so a link
// inside a root that points outside it is refused too. Pure node code (no
// vscode import): unit-tested in test/unit_proofmap.cjs with a fake lookup.
import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

export interface FileLookup {
  exists: (path: string) => boolean;
  realpath: (path: string) => string;   // canonical form; may return the input when it cannot be resolved
}

const onDisk: FileLookup = {
  exists: existsSync,
  realpath: path => { try { return realpathSync(path); } catch { return resolve(path); } },
};

/** True when `candidate` is `root` itself or lies under it (both already canonical). */
export function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export interface ResolvedFile {
  path?: string;      // the first existing candidate under one of the roots
  refused?: string;   // an existing candidate that lies outside every root (never opened)
}

/**
 * Resolve `file` (absolute, or relative to each root in turn) to an existing
 * path under one of `roots`. An existing path outside every root, including
 * `../` escapes and symlinks that leave the root, is reported as `refused`.
 */
export function resolveWithin(file: string, roots: readonly string[], lookup: FileLookup = onDisk): ResolvedFile {
  const canonicalRoots = roots.map(root => lookup.realpath(root));
  const candidates = isAbsolute(file) ? [resolve(file)] : roots.map(root => join(root, file));
  let refused: string | undefined;
  for (const candidate of candidates) {
    if (!lookup.exists(candidate)) continue;
    const real = lookup.realpath(candidate);
    if (canonicalRoots.some(root => isInside(root, real))) return { path: candidate };
    refused ??= candidate;
  }
  return refused ? { refused } : {};
}
