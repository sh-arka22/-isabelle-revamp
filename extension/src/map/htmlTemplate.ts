// The ProofMap webview document. It is entirely static: every piece of graph
// text is set later through textContent by the bundled script, so nothing
// from dag.json is ever interpolated into HTML. Scripts run only with the
// nonce; the stylesheet and script come from the extension's dist/ folder.

export interface ProofMapHtmlOptions {
  nonce: string;
  cspSource: string;   // webview.cspSource
  scriptUri: string;   // asWebviewUri(dist/webview/map.js)
  styleUri: string;    // asWebviewUri(dist/webview/map.css)
}

export function proofMapCsp({ nonce, cspSource }: Pick<ProofMapHtmlOptions, 'nonce' | 'cspSource'>): string {
  return `default-src 'none'; img-src ${cspSource} data:; style-src ${cspSource}; font-src ${cspSource}; script-src 'nonce-${nonce}'`;
}

export function proofMapHtml(options: ProofMapHtmlOptions): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${proofMapCsp(options)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ProofMap</title>
<link rel="stylesheet" href="${options.styleUri}">
</head><body>
<div id="app">
<header id="toolbar" aria-label="ProofMap toolbar">
<button id="fit" type="button" title="Fit the whole graph in view">Fit</button>
<button id="relayout" type="button" title="Run the dagre layout again">Re-layout</button>
<button id="reload" type="button" title="Re-read the configured dag.json">Reload</button>
<input id="filter" type="search" placeholder="filter: status:sorry theory:Apery.Bounds label:B3 text" aria-label="Filter nodes">
<span id="filter-count" aria-live="polite"></span>
<label class="toggle" title="Keep the node the agent has claimed centred"><input id="follow" type="checkbox"> Follow agent</label>
<button id="snapshot" type="button" title="Load a replay dag.json">Open snapshot…</button>
<button id="newwindow" type="button" title="Move this panel into its own window">New window</button>
</header>
<main id="workspace">
<div id="graph" role="application" aria-label="Theorem dependency graph: hover for the statement, click for details, double-click to open the theory"></div>
<div id="tooltip" role="tooltip" hidden></div>
<div id="empty" hidden><div id="empty-text"></div></div>
<aside id="side">
<section id="progress" aria-label="Session progress">
<h2>Session progress</h2>
<p id="summary"></p>
<div id="counts"></div>
<p id="next-hole"></p>
<div id="claims"></div>
<p id="meta" class="muted"></p>
</section>
<section id="details" aria-label="Selected node">
<h2>Node</h2>
<p id="details-empty" class="muted">Click a node for its statement, status, dependencies and location. Double-click opens the theory at that line.</p>
<div id="details-body" hidden></div>
</section>
<section id="events-section" aria-label="Map events">
<h2>Map events</h2>
<ol id="events" role="log" aria-live="polite"></ol>
</section>
</aside>
</main>
<footer id="statusbar">
<div id="legend" aria-label="Legend"></div>
<p id="status" role="status" aria-live="polite"></p>
</footer>
</div>
<script nonce="${options.nonce}" src="${options.scriptUri}"></script>
</body></html>`;
}
