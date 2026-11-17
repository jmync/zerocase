// Records real moments of the NKMACB site (nakama-battle.onrender.com) into clips for the showreel, 1920 × 1080, no sound:
//   node showreel/record.js site     → media/nkmacb/site.mp4    the info page: the seal pulses, a click breaks it open, the hero comes up
//   node showreel/record.js reveal   → media/nkmacb/reveal.mp4  host control's Finals: CROWN THE WINNER → the scores climb → the crown lands
// The reveal runs on the live page, but every /api call is answered inside the browser (Fetch interception) with the
// official Finals result (Kurezee 97.50, TN🔥C 94.20, from Finals-Results.png): nothing is signed in to, and nothing
// reaches or changes the live server. Only the page's own files (code, art, the reveal's video) are fetched.
// Chrome's screencast sends a frame whenever the page changes; they're laid on a steady 30 fps timeline and encoded
// with encoder.js (WebCodecs) in a local page.
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const SITE = process.env.NKMA_URL || 'https://nakama-battle.onrender.com';
const SCENE = process.argv[2] || 'site';
const PORT = 9643, W = 1920, H = 1080, FPS = 30;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The stand-in API for the reveal: the Finals as it ended, and "ok" for everything else
const FINALS = { ok: true, matchups: [{ teams: [{ team: 'Kurezee', final: 97.5 }, { team: 'TN🔥C', final: 94.2 }], tie: false }], skipped: [] };
function fakeApi(url, method) {
  const u = new URL(url);
  if (u.pathname === '/api/host/login') return { ok: true };
  if (u.pathname === '/api/host/stage') return { ok: true, stage: 'Finals' };
  if (u.pathname === '/api/host/state') return method === 'GET' ? { ok: true, state: {} } : { ok: true };
  if (u.pathname === '/api/host/results') return FINALS;
  return { ok: true };
}

async function main() {
  for (let i = 0; i < 10; i++) { try { if ((await fetch(SITE)).ok) break; } catch {} await sleep(6000); } // Render's free tier sleeps

  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--remote-debugging-port=${PORT}`, `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'))}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 60 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const waiting = new Map(); const frames = []; const apiLog = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => { waiting.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { const p = waiting.get(m.id); waiting.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
    if (m.method === 'Page.screencastFrame') {
      frames.push({ t: m.params.metadata.timestamp, data: m.params.data });
      send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
    }
    if (m.method === 'Fetch.requestPaused') {
      const { requestId, request } = m.params;
      apiLog.push(request.method + ' ' + request.url.replace(SITE, ''));
      const body = Buffer.from(JSON.stringify(fakeApi(request.url, request.method))).toString('base64');
      send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body }).catch(() => {});
    }
  });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
  const glide = async (from, to, steps = 24) => {
    for (let i = 1; i <= steps; i++) { const e = 1 - Math.pow(1 - i / steps, 3); await mouse('mouseMoved', from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e); await sleep(25); }
  };
  const rectOf = (js) => evaluate(`(() => { const e = ${js}; if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`);
  const waitFor = async (js, ms = 30000) => { for (let t = 0; t < ms; t += 200) { try { const r = await rectOf(js); if (r) return r; } catch {} await sleep(200); } throw new Error('never appeared: ' + js); };
  const byText = (sel, text) => `[...document.querySelectorAll('${sel}')].find((b) => b.textContent.trim() === ${JSON.stringify(text)})`;

  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.enable');
  const rest = { x: W * 0.8, y: H * 0.85 };

  if (SCENE === 'site') {
    await send('Page.navigate', { url: SITE + '/info' });
    const seal = await waitFor("document.querySelector('.sh-hit')");
    await sleep(3500);
    await mouse('mouseMoved', rest.x, rest.y);
    await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    await sleep(1600);
    await glide(rest, seal);
    await sleep(700);
    await mouse('mousePressed', seal.x, seal.y); await mouse('mouseReleased', seal.x, seal.y);
    await sleep(5200);
    await mouse('mouseMoved', W * 0.9, H * 0.9);
    await sleep(1200);
  } else if (SCENE === 'reveal') {
    await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
    // a host session and the Finals, as the portal keeps them
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { sessionStorage.setItem('nkma_host', 'showreel'); localStorage.setItem('nkma_host_stage', JSON.stringify({ stage: 'Finals', round: 'Finals' })); } catch (e) {}` });
    await send('Page.navigate', { url: SITE + '/host-control' });
    const btn = await waitFor(byText('button', 'CROWN THE WINNER'), 60000);
    await sleep(6000); // the board's art and the bed music settle
    await mouse('mouseMoved', rest.x, rest.y);
    await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    await sleep(1500);
    await glide(rest, btn);
    await sleep(500);
    await mouse('mousePressed', btn.x, btn.y); await mouse('mouseReleased', btn.x, btn.y);
    const yes = await waitFor("document.querySelector('.sr-confirm-yes')", 8000);
    await sleep(900);
    await glide(btn, yes, 16);
    await sleep(300);
    await mouse('mousePressed', yes.x, yes.y); await mouse('mouseReleased', yes.x, yes.y);
    await mouse('mouseMoved', W * 0.97, H * 0.97);
    await sleep(17000); // the scores climb, the crown lands (10.5 s after the press) and is carried to the winner
  } else throw new Error('scene: site or reveal');

  await send('Page.stopScreencast');
  await sleep(300);
  if (apiLog.length) console.log('answered in the browser:', [...new Set(apiLog)].join(', '));
  if (frames.length < 10) throw new Error('only ' + frames.length + ' frames came through');

  const t0 = frames[0].t, t1 = frames[frames.length - 1].t + 0.2, timeline = [];
  for (let k = 0, j = 0; t0 + k / FPS <= t1; k++) {
    while (j + 1 < frames.length && frames[j + 1].t <= t0 + k / FPS) j++;
    timeline.push(frames[j].data);
  }
  console.log(`${frames.length} screencast frames → ${timeline.length} video frames (${(timeline.length / FPS).toFixed(1)} s)`);

  // encode with the reel's own encoder, in a local page (WebCodecs needs a secure context; about:blank isn't one)
  if (SCENE === 'reveal') await send('Fetch.disable');
  await send('Page.navigate', { url: 'file:///' + path.join(__dirname, 'lib', 'blank.html').split(path.sep).join('/') });
  await sleep(500);
  for (const f of ['lib/mp4-muxer.js', 'encoder.js']) await evaluate(fs.readFileSync(path.join(__dirname, f), 'utf8') + '\n;0');
  await evaluate(`encInit(${JSON.stringify({ w: W, h: H, fps: FPS, bitrate: 10e6, audio: null })})`);
  for (const jpg of timeline) await evaluate(`encAdd("${jpg}")`);
  const size = await evaluate('encFinish()');
  const parts = [];
  for (let s = 0; s < size; s += 4 << 20) parts.push(Buffer.from(await evaluate(`encPiece(${s}, ${4 << 20})`), 'base64'));
  const out = path.join(__dirname, 'media', 'nkmacb', `${SCENE}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.concat(parts));
  console.log(out, (size / 1048576).toFixed(1) + ' MB');
  ws.close(); chrome.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
