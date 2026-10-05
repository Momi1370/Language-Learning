export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}

// Like el.append(), but flattens lists and skips null/undefined/false
// (plain append would print them as "null" or "[object HTMLElement]").
export function mount(parent, ...children) {
  parent.append(...children.flat(Infinity).filter((c) => c != null && c !== false));
  return parent;
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export function button(label, onClick, props = {}) {
  return h('button', { type: 'button', ...props, onClick }, label);
}

export function fa(text) {
  return text ? h('p', { class: 'fa', dir: 'rtl', lang: 'fa' }, text) : null;
}
