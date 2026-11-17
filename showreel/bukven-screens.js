// Renders BUKVEN app screens from the brand kit (explore-bukidnon-app/docs/brand/social/campaign/screens: each one is the
// app's screen redrawn from its code and the local API's data) into media/bukven/screens/<key>.png, 956 × 1960 (a phone
// at 2×, frame included). The reel shows them in its own phones; no marketing videos.
//   node showreel/bukven-screens.js             every screen
//   node showreel/bukven-screens.js music,rentCar   just these
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const KIT = path.resolve(__dirname, '../../explore-bukidnon-app/docs/brand/social/campaign');
const OUT = path.join(__dirname, 'media', 'bukven', 'screens');
const PORT = 9644;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// key → the screen files it needs, in order
const FILES = {};
for (const f of fs.readdirSync(path.join(KIT, 'screens')).filter((f) => f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(KIT, 'screens', f), 'utf8');
  for (const m of src.matchAll(/SCREENS\.([A-Za-z0-9_]+)\s*=/g)) FILES[m[1]] ??= f.replace(/\.js$/, '');
}
// some screens build on another file's data
const NEEDS = { 'event-reg': ['spots', 'spot-trip'], 'spot-trip': ['spots'], 'huni-chat': ['huni'], alerts: ['safety'], route: ['routes'] };
const wanted = process.argv[2] ? process.argv[2].split(',') : Object.keys(FILES);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--hide-scrollbars', '--allow-file-access-from-files',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'scr-'))}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 60 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const waiting = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { const p = waiting.get(m.id); waiting.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } });
  const send = (method, params = {}) => new Promise((resolve, reject) => { waiting.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;
  await send('Emulation.setDeviceMetricsOverride', { width: 478, height: 980, deviceScaleFactor: 2, mobile: false });
  // transparent around the phone, so it sits on the reel's own ground
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await send('Page.enable');
  for (const key of wanted) {
    const file = FILES[key];
    if (!file && key !== 'home') { console.log('no such screen:', key); continue; }
    const files = key === 'home' ? ['home'] : [...(NEEDS[file] || []), file];
    const url = 'file:///' + path.join(KIT, 'screen-preview.html').split(path.sep).join('/') + `?s=${files.join(',')}&k=${key}`;
    await send('Page.navigate', { url });
    for (let i = 0; i < 100 && (await evaluate('document.readyState')) !== 'complete'; i++) await sleep(100);
    await evaluate('document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))');
    await sleep(400);
    const ok = await evaluate("!!document.querySelector('#w .phone, #w > *')");
    // just the phone: no page colour, cropped to its edges
    const r = await evaluate(`(() => { document.documentElement.style.background = document.body.style.background = 'transparent';
      const b = document.querySelector('#w > *').getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: b.height }; })()`);
    const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { ...r, scale: 1 } });
    fs.writeFileSync(path.join(OUT, key + '.png'), Buffer.from(data, 'base64'));
    console.log(key.padEnd(18), file, ok ? '' : '(empty?)');
  }
  ws.close(); chrome.kill();
})().catch((e) => { console.error(e); process.exit(1); });
