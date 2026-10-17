// Bundles ONLY the ProofMap webview (webview/map/main.ts + map.css) into
// dist/webview/ as a browser IIFE with Cytoscape and cytoscape-dagre inlined:
// no CDN, no network, so it runs under the webview's default-src 'none' CSP.
// The extension host itself is still compiled by `tsc -p .` into out/.
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');

const options = {
  // main.ts imports map.css, so esbuild writes dist/webview/map.js and map.css.
  entryPoints: { map: join(root, 'webview/map/main.ts') },
  outdir: join(root, 'dist/webview'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
  absWorkingDir: root,
};

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
  console.log('esbuild: watching webview/map …');
} else {
  await esbuild.build(options);
}
