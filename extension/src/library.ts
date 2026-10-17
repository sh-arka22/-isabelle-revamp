import { execFile } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

export interface IsabelleRoots { home: string; homeUser: string }

// `isabelle getenv -b` prints one bare value per line, in argument order.
export async function isabelleRoots(executable: string): Promise<IsabelleRoots> {
  const { stdout } = await promisify(execFile)(executable,
    ['getenv', '-b', 'ISABELLE_HOME', 'ISABELLE_HOME_USER'], { timeout: 15000 });
  const [home = '', homeUser = ''] = stdout.split('\n').map(line => line.trim());
  if (!home) throw new Error('isabelle getenv returned no ISABELLE_HOME');
  return { home, homeUser };
}

function inside(path: string, root: string): boolean {
  if (!root || !isAbsolute(root)) return false;
  const part = relative(resolve(root), resolve(path));
  return part === '' || (part !== '..' && !part.startsWith('..' + sep) && !isAbsolute(part));
}

// Library sources live under the distribution (HOL, HOL-Analysis, Pure ML)
// or under the user's component directory (AFP checkouts, ~/.isabelle/).
export function isLibraryPath(fsPath: string, isabelleHome: string, isabelleHomeUser = ''): boolean {
  return inside(fsPath, isabelleHome) || inside(fsPath, isabelleHomeUser);
}

// Installations are often symlinked; compare both the spelled and the real paths.
export async function libraryRoots(roots: IsabelleRoots): Promise<string[]> {
  const result = new Set<string>();
  for (const root of [roots.home, roots.homeUser]) {
    if (!root) continue;
    result.add(root);
    try { result.add(await realpath(root)); } catch { /* not created yet */ }
  }
  return [...result];
}

export async function isLibraryFile(fsPath: string, roots: string[]): Promise<boolean> {
  const candidates = [fsPath];
  try { candidates.push(await realpath(fsPath)); } catch { /* unsaved or removed */ }
  return candidates.some(path => roots.some(root => isLibraryPath(path, root)));
}
