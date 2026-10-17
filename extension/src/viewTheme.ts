import { escapeText } from './outputText';

export const viewTheme = `body {
  padding: 12px;
  color: var(--vscode-foreground);
  background: var(--vscode-sideBar-background);
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}
header { border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 10px; }
h1 { font-size: 1em; margin: 0 0 6px; overflow-wrap: anywhere; }
.status { margin: 0; color: var(--vscode-descriptionForeground); }
.error .status, .errors { color: var(--vscode-errorForeground); }
pre {
  font-family: var(--vscode-editor-font-family), monospace;
  font-size: var(--vscode-editor-font-size);
  font-weight: var(--vscode-editor-font-weight);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
pre:empty { display: none; }
/* Isabelle etc/isabelle.css uses .source for mathematical output. Keep the
   host's font and colours instead of its fixed light-page background. */
.source { direction: ltr; unicode-bidi: isolate; font-family: var(--vscode-editor-font-family), monospace; }
body.vscode-high-contrast header, body.vscode-high-contrast-light header {
  border-color: var(--vscode-contrastBorder);
}`;

// Isabelle's PIDE text palette as [light, dark] pairs. Ported from
// yfprojects/vscode-isabelle src/colors.ts (BSD-3-Clause), which took them
// from the official extension's isabelle.text_color defaults; see
// ../THIRD_PARTY_NOTICES.md. The dark keyword3 value had a stray parenthesis.
export const textColours: Record<string, readonly [string, string]> = {
  antiquote: ['rgba(102, 0, 204, 1)', 'rgba(197, 134, 192, 1)'],
  bound: ['rgba(0, 128, 0, 1)', 'rgba(96, 139, 78, 1)'],
  class_parameter: ['rgba(210, 105, 30, 1)', 'rgba(210, 105, 30, 1)'],
  comment1: ['rgba(129, 31, 63, 1)', 'rgba(100, 102, 149, 1)'],
  comment2: ['rgba(209, 105, 105, 1)', 'rgba(206, 155, 120, 1)'],
  comment3: ['rgba(0, 128, 0, 1)', 'rgba(96, 139, 78, 1)'],
  dynamic: ['rgba(121, 94, 38, 1)', 'rgba(220, 220, 170, 1)'],
  free: ['rgba(0, 0, 255, 1)', 'rgba(86, 156, 214, 1)'],
  improper: ['rgba(205, 49, 49, 1)', 'rgba(244, 71, 71, 1)'],
  inner_cartouche: ['rgba(129, 31, 63, 1)', 'rgba(209, 105, 105, 1)'],
  inner_comment: ['rgba(0, 128, 0, 1)', 'rgba(96, 139, 78, 1)'],
  inner_numeral: ['rgba(9, 136, 90, 1)', 'rgba(181, 206, 168, 1)'],
  inner_quoted: ['rgba(163, 21, 21, 1)', 'rgba(206, 145, 120, 1)'],
  keyword1: ['rgba(175, 0, 219, 1)', 'rgba(197, 134, 192, 1)'],
  keyword2: ['rgba(9, 136, 90, 1)', 'rgba(181, 206, 168, 1)'],
  keyword3: ['rgba(38, 127, 153, 1)', 'rgba(78, 201, 176, 1)'],
  operator: ['rgba(50, 50, 50, 1)', 'rgba(212, 212, 212, 1)'],
  plain_text: ['rgba(102, 0, 204, 1)', 'rgba(197, 134, 192, 1)'],
  quasi_keyword: ['rgba(153, 102, 255, 1)', 'rgba(153, 102, 255, 1)'],
  raw_text: ['rgba(102, 0, 204, 1)', 'rgba(197, 134, 192, 1)'],
  skolem: ['rgba(210, 105, 30, 1)', 'rgba(210, 105, 30, 1)'],
  tfree: ['rgba(160, 32, 240, 1)', 'rgba(160, 32, 240, 1)'],
  tvar: ['rgba(160, 32, 240, 1)', 'rgba(160, 32, 240, 1)'],
  var: ['rgba(0, 16, 128, 1)', 'rgba(156, 220, 254, 1)'],
  // etc/isabelle.css only
  binding: ['#336655', 'rgba(120, 180, 160, 1)'],
};

const backgrounds: Record<string, readonly [string, string]> = {
  bad: ['rgba(255, 106, 106, 0.4)', 'rgba(255, 106, 106, 0.4)'],
  intensify: ['rgba(255, 204, 102, 0.4)', 'rgba(204, 136, 0, 0.2)'],
  quoted: ['rgba(139, 139, 139, 0.1)', 'rgba(150, 150, 150, 0.15)'],
  antiquoted: ['rgba(255, 200, 50, 0.1)', 'rgba(255, 214, 102, 0.15)'],
  writeln_message: ['#F0F0F0', 'rgba(255, 255, 255, 0.06)'],
  information_message: ['#DCEAF3', 'rgba(193, 223, 238, 0.15)'],
  tracing_message: ['#F0F8FF', 'rgba(240, 248, 255, 0.08)'],
  warning_message: ['#EEE8AA', 'rgba(238, 232, 170, 0.18)'],
  legacy_message: ['#EEE8AA', 'rgba(238, 232, 170, 0.18)'],
  error_message: ['#FFC1C1', 'rgba(255, 193, 193, 0.18)'],
};

const underlines: Record<string, string> = {
  writeln: '#C0C0C0', information: '#C1DFEE', warning: '#FF8C00', legacy: '#FF8C00', error: '#B22222',
};

function themed(table: Record<string, readonly [string, string]>, property: string): string {
  return Object.entries(table).map(([name, [light, dark]]) =>
    `body.vscode-light .${name} { ${property}: ${light}; }\nbody.vscode-dark .${name} { ${property}: ${dark}; }`).join('\n');
}

// Colours for the sanitised server output (see outputHtml.ts). High-contrast
// themes keep the theme's own foreground and mark messages with borders.
export const outputStyles = `${themed(textColours, 'color')}
${themed(backgrounds, 'background-color')}
${Object.entries(underlines).map(([name, colour]) => `.${name} { border-bottom: 1px dotted ${colour}; }`).join('\n')}
.name { font-style: italic; }
.control, .literal, .bold, .command, .keyword { font-weight: bold; }
.control { font-style: italic; }
.sendback { border: 1px solid var(--vscode-button-background); border-radius: 3px; padding: 0 3px; }
.isa-link { cursor: pointer; text-decoration: underline dotted; text-underline-offset: 2px; }
.isa-link:hover { color: var(--vscode-textLink-activeForeground); }
sup, sub { font-size: .75em; line-height: 0; }
body.vscode-high-contrast .source span, body.vscode-high-contrast-light .source span { color: inherit; background: none; }
body.vscode-high-contrast .error_message, body.vscode-high-contrast-light .error_message { color: var(--vscode-errorForeground); }
body.vscode-high-contrast .warning_message, body.vscode-high-contrast-light .warning_message { color: var(--vscode-editorWarning-foreground); }
body.vscode-high-contrast .sendback, body.vscode-high-contrast-light .sendback { border-color: var(--vscode-contrastBorder); }`;

// `actions` is trusted markup built by the caller, never server content.
export function viewHeader(theory: string, status: string, actions = '', position = ''): string {
  return `<header><h1>${escapeText(theory)}</h1>
<p class="meta"><span id="position" class="position">${escapeText(position)}</span>
<span class="status badge" role="status" aria-live="polite">${escapeText(status)}</span></p>
<div id="header-actions" class="actions">${actions}</div></header>`;
}
