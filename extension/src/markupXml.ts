// PIDE/sledgehammer_output carries Isabelle XML markup (XML.string_of_body of
// the query's messages), not HTML: a sequence of <writeln_message> and
// <error_message> elements whose proof suggestions are <sendback> elements.
// This parser only builds a tree and text; rendering happens elsewhere with
// DOM nodes, never innerHTML.
export interface MarkupElement { name: string; attributes: Record<string, string>; children: MarkupNode[] }
export type MarkupNode = string | MarkupElement;

const entities: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

export function decodeEntities(text: string): string {
  return text.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[\da-f]+);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return entities[name.toLowerCase()];
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : entity;
  });
}

// XML.Output writes names unquoted and every attribute value in double quotes.
const tagPattern = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[A-Za-z_][\w.:-]*="[^"]*")*)\s*(\/?)>/y;
const attributePattern = /([A-Za-z_][\w.:-]*)="([^"]*)"/g;

// Tolerant: a stray `<` is text, a mismatched close tag is ignored and
// elements still open at the end are closed, so no server string can throw.
export function parseMarkup(xml: string): MarkupNode[] {
  const root: MarkupElement = { name: '', attributes: {}, children: [] };
  const stack = [root];
  let text = '';
  const flush = () => {
    const children = stack[stack.length - 1].children;
    const last = children.length - 1;
    if (text && typeof children[last] === 'string') children[last] += decodeEntities(text);
    else if (text) children.push(decodeEntities(text));
    text = '';
  };
  let i = 0;
  while (i < xml.length) {
    const next = xml.indexOf('<', i);
    if (next < 0) { text += xml.slice(i); break; }
    text += xml.slice(i, next);
    tagPattern.lastIndex = next;
    const match = tagPattern.exec(xml);
    if (!match) { text += '<'; i = next + 1; continue; }
    const [whole, closing, name, attributes, selfClosing] = match;
    i = next + whole.length;
    flush();
    if (closing) {
      let depth = stack.length - 1;
      while (depth > 0 && stack[depth].name !== name) depth--;
      if (depth > 0) stack.length = depth;
      continue;
    }
    const element: MarkupElement = { name, children: [], attributes: Object.fromEntries(
      [...attributes.matchAll(attributePattern)].map(item => [item[1], decodeEntities(item[2])])) };
    stack[stack.length - 1].children.push(element);
    if (!selfClosing) stack.push(element);
  }
  flush();
  return root.children;
}

// A wrapped element (XML.Wrapped_Elem) carries front-end data in <xml_body>;
// it is never part of the text a reader sees.
export function markupText(nodes: MarkupNode[]): string {
  let text = '';
  for (const node of nodes) {
    if (typeof node === 'string') text += node;
    else if (node.name !== 'xml_body') text += markupText(node.children);
  }
  return text;
}

export interface MessageSegment { text: string; sendback?: boolean }
export interface OutputMessage { kind: string; segments: MessageSegment[]; text: string; sendback?: string }

function segmentsOf(nodes: MarkupNode[], into: MessageSegment[]): MessageSegment[] {
  for (const node of nodes) {
    if (typeof node === 'string') into.push({ text: node });
    else if (node.name === 'sendback') into.push({ text: markupText(node.children).trim(), sendback: true });
    else if (node.name !== 'xml_body') segmentsOf(node.children, into);
  }
  return into;
}

// Messages are the top-level <kind_message> elements; their order is the
// order of discovery, and each output replaces the previous one entirely.
export function outputMessages(xml: string): OutputMessage[] {
  const messages: OutputMessage[] = [];
  for (const node of parseMarkup(xml)) {
    if (typeof node === 'string' || !node.name.endsWith('_message')) continue;
    const segments = segmentsOf(node.children, []).reduce<MessageSegment[]>((merged, segment) => {
      const last = merged[merged.length - 1];
      if (last && !last.sendback && !segment.sendback) last.text += segment.text;
      else merged.push({ ...segment });
      return merged;
    }, []).filter(segment => segment.text);
    const text = segments.map(segment => segment.text).join('').trim();
    const sendback = segments.find(segment => segment.sendback)?.text;
    messages.push({ kind: node.name.slice(0, -'_message'.length), segments, text,
      ...(sendback !== undefined ? { sendback } : {}) });
  }
  return messages;
}

export interface SledgehammerResult {
  text: string; insertable: boolean; prover?: string; time?: string; message: string;
}

// "verit: Try this: <sendback>by simp</sendback> (4 ms)" is insertable;
// "One-line proof reconstruction failed: by (metis …)" is shown but not.
export function sledgehammerResults(messages: OutputMessage[]): SledgehammerResult[] {
  const results: SledgehammerResult[] = [];
  for (const message of messages) {
    const prover = /^([^\s:]+):\s*(?:Try this|One-line proof reconstruction failed)/.exec(message.text)?.[1];
    const time = /\(([^()]+)\)\s*$/.exec(message.text)?.[1];
    const failed = /reconstruction failed:\s*([\s\S]+?)\s*$/.exec(message.text)?.[1];
    const text = message.sendback ?? failed;
    if (!text || results.some(result => result.text === text)) continue;
    results.push({ text, insertable: message.sendback !== undefined, message: message.text,
      ...(prover ? { prover } : {}), ...(time && message.sendback ? { time } : {}) });
  }
  return results;
}
