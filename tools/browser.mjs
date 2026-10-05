// Minimal headless-Chrome driver over the DevTools protocol (no dependencies).
// Used by tools/smoke.mjs. `chrome --dump-dom` hangs on some Macs, so we drive Chrome directly.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// args: extra Chrome flags, e.g. FAKE_MIC to record without a real microphone.
export const FAKE_MIC = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];

export async function launch({ width = 320, height = 900, args = [] } = {}) {
  const profile = await mkdtemp(join(tmpdir(), 'taalmaatje-cdp-'));
  // Port 0: Chrome picks a free port and writes it to DevToolsActivePort, so runs never collide.
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${profile}`, ...args, 'about:blank',
  ], { stdio: 'ignore' });

  let page = null;
  for (let i = 0; i < 75 && !page; i++) {
    await sleep(200);
    const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split('\n')[0];
    if (!port) continue;
    const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).catch(() => null);
    page = list?.find((t) => t.type === 'page') ?? null;
  }
  if (!page) {
    proc.kill();
    throw new Error('Chrome did not start');
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method === 'Page.javascriptDialogOpening') {
      // Accept confirm()/alert() so flows like reset and restore can be tested.
      ws.send(JSON.stringify({ id: ++nextId, method: 'Page.handleJavaScriptDialog', params: { accept: true } }));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push(d.exception?.description ?? d.text);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      // Network failures (e.g. a module that did not load) only show up here.
      const { text, url } = msg.params.entry;
      if (!/favicon\.ico/.test(url ?? '')) errors.push(`${text} ${url ?? ''}`.trim());
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };

  return {
    errors,
    evaluate,
    goto: (url) => send('Page.navigate', { url }),
    async waitFor(expression, timeout = 10000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (await evaluate(expression).catch(() => false)) return true;
        await sleep(100);
      }
      return false;
    },
    // Click the first button or link whose text contains `text`.
    click: (text) => evaluate(`(() => {
      const el = [...document.querySelectorAll('button, a, summary')].find((b) => b.textContent.includes(${JSON.stringify(text)}) && !b.disabled);
      if (!el) return false;
      el.click();
      return true;
    })()`),
    text: () => evaluate('document.querySelector("main").innerText'),
    async screenshot(path) {
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      await writeFile(path, Buffer.from(data, 'base64'));
    },
    async close() {
      ws.close();
      proc.kill();
      await rm(profile, { recursive: true, force: true }).catch(() => {});
    },
  };
}
