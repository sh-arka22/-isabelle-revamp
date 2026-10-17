// A small DOM for running the webview scripts under node: a tree built from
// the page's body markup with the element methods the scripts use. No layout,
// no CSS; sizes are fixed numbers. No browser automation is involved.
const vm = require('node:vm');
const { tokenize } = require('../out/outputHtml');
const { decodeEntities } = require('../out/outputText');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.parent = null; this.attributes = {};
    this.dataset = {}; this.events = {}; this._text = ''; this._html = ''; this.value = '';
    this.disabled = false; this.hidden = false; this.focused = false;
    this.scrollTop = 0; this.scrollHeight = 0; this.clientHeight = 100; this.clientWidth = 300;
  }
  get className() { return this.attributes.class || ''; }
  set className(value) { this.attributes.class = String(value); }
  get id() { return this.attributes.id || ''; }
  get classList() {
    const element = this;
    return {
      contains: name => element.className.split(/\s+/).includes(name),
      toggle(name, force) {
        const has = this.contains(name), want = force === undefined ? !has : !!force;
        if (want && !has) element.className = (element.className + ' ' + name).trim();
        if (!want && has) element.className = element.className.split(/\s+/).filter(item => item !== name).join(' ');
        return want;
      },
      add(name) { this.toggle(name, true); },
      remove(name) { this.toggle(name, false); },
    };
  }
  get textContent() { return this.children.length ? this.children.map(child => child.textContent).join('') : this._text; }
  set textContent(value) { this._text = String(value); this._html = ''; this.children = []; }
  get innerHTML() { return this._html; }
  set innerHTML(value) { this._html = String(value); this._text = ''; this.children = []; }
  setAttribute(name, value) {
    if (name === 'class') this.className = value;
    else { this.attributes[name] = String(value); if (name.startsWith('data-')) this.dataset[camel(name.slice(5))] = String(value); }
  }
  getAttribute(name) { return name === 'class' ? this.className : (this.attributes[name] ?? null); }
  append(...nodes) { for (const node of nodes) this.appendChild(node); }
  appendChild(child) { this.insertBefore(child, null); return child; }
  insertBefore(child, before) {
    child.remove();
    this.children.splice(before ? this.children.indexOf(before) : this.children.length, 0, child);
    child.parent = this;
  }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; } }
  addEventListener(name, callback) { (this.events[name] ||= []).push(callback); }
  // Bubbles like a real click: target is the element first dispatched to.
  dispatch(name, event = {}) {
    const detail = { target: this, preventDefault() { this.prevented = true; }, ...event };
    for (let element = this; element; element = element.parent) for (const callback of element.events[name] || []) callback(detail);
    return detail;
  }
  matches(selector) {
    return selector.split(',').some(part => {
      part = part.trim();
      const attribute = /^\[([\w-]+)\]$/.exec(part);
      if (attribute) return attribute[1] in this.attributes;
      if (part.startsWith('.')) return this.classList.contains(part.slice(1));
      if (part.startsWith('#')) return this.id === part.slice(1);
      return this.tagName === part.toUpperCase();
    });
  }
  closest(selector) { for (let element = this; element; element = element.parent) if (element.matches(selector)) return element; return null; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  focus() { this.focused = true; }
  getBoundingClientRect() { return { width: this.textContent.length * 7, height: 14 }; }
}
const camel = name => name.replace(/-(\w)/g, (_, char) => char.toUpperCase());

// Build the tree of everything between <body> and the script.
function build(html) {
  const body = new Element('body');
  const start = html.indexOf('<body'), end = html.indexOf('<script');
  const stack = [body];
  for (const token of tokenize(html.slice(html.indexOf('>', start) + 1, end))) {
    const top = stack[stack.length - 1];
    if (token.kind === 'text') { const text = new Element('#text'); text._text = token.value; top.appendChild(text); }
    else if (token.kind === 'open') {
      const element = new Element(token.name);
      for (const [name, value] of Object.entries(token.attributes)) element.setAttribute(name, decodeEntities(value));
      top.appendChild(element);
      if (!token.selfClosing && !['br', 'meta', 'input'].includes(token.name)) stack.push(element);
    } else if (token.kind === 'close') {
      const index = stack.map(item => item.tagName).lastIndexOf(token.name.toUpperCase());
      if (index > 0) stack.length = index;
    }
  }
  return body;
}

// Run the page's nonce script against the tree. Returns the document, the
// messages posted to the extension, the webview state and a receive() that
// delivers an extension message.
function mount(html, nonce, options = {}) {
  const body = build(html);
  const posted = [];
  let saved = options.state ?? {};
  const listeners = {};
  const document = {
    body,
    getElementById: id => body.querySelector('#' + id),
    querySelector: selector => body.querySelector(selector),
    querySelectorAll: selector => body.querySelectorAll(selector),
    createElement: tag => new Element(tag),
  };
  const context = vm.createContext({
    document, setTimeout, clearTimeout, getComputedStyle: () => ({ paddingLeft: '12px', paddingRight: '12px' }),
    window: { addEventListener: (name, callback) => { (listeners[name] ||= []).push(callback); } },
    acquireVsCodeApi: () => ({ postMessage: value => posted.push(value), getState: () => saved, setState: value => { saved = value; } }),
    console,
  });
  const script = html.match(new RegExp(`<script nonce="${nonce}">([\\s\\S]+)<\\/script>`))[1];
  vm.runInContext(script, context);
  return { document, body, posted, state: () => saved,
    receive: data => { for (const callback of listeners.message || []) callback({ data }); },
    fire: (name, event) => { for (const callback of listeners[name] || []) callback(event); } };
}

module.exports = { Element, build, mount };
