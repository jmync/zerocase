// Renders showreel.html to out/showreel.mp4 (1920 × 1080, H.264 + AAC), no ffmpeg needed:
//   node showreel/render.js
// Headless Chrome steps the page's seek(t) one frame at a time and screenshots it;
// the same tab encodes them with WebCodecs (encoder.js), makes the sound from the page's cue list,
// and muxes both into an MP4.
//   --stills 1.2,4,9.5   PNG stills of those moments into out/stills/ (no video)
//   --from 20 --to 34    only that stretch (seconds), for checking a scene
//   --sound              out/showreel-sound.wav only (the sound track, for listening)
//   --mute               no sound track
//   --out <file>         another output file
//   --part buk       one project on its own (buk, specs or nkma) → out/<part>.mp4, lighter for the web
//   --port <n>           another DevTools port (default 9641)
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : null; };
const has = (n) => process.argv.includes(n);
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = +arg('--port') || 9641;
const OUT = path.join(__dirname, 'out');
const PART = arg('--part'); // buk | specs | nkma: one project's video, for the site
const stills = arg('--stills') ? arg('--stills').split(',').map(Number) : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fileUrl = (f) => 'file:///' + path.join(__dirname, f).replace(/\\/g, '/');

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0; const waiting = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && waiting.has(m.id)) { const p = waiting.get(m.id); waiting.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => { waiting.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return { ws, send, evaluate };
}

async function open(url, w, h) {
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const page = await connect(t.webSocketDebuggerUrl);
  await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.enable');
  await page.send('Page.navigate', { url });
  for (let i = 0; i < 300; i++) {
    await sleep(100);
    try { if ((await page.evaluate('document.readyState')) === 'complete') break; } catch {}
  }
  return page;
}

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'showreel-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--hide-scrollbars', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { await sleep(200); try { await fetch(`http://127.0.0.1:${PORT}/json/version`); break; } catch {} }

  const reel = await open(fileUrl('showreel.html') + '?render' + (PART ? '&part=' + PART : ''), 1920, 1080);
  for (let i = 0; i < 300 && (await reel.evaluate('typeof window.ready')) !== 'object'; i++) await sleep(100);
  await reel.evaluate('window.ready');
  const { fps, duration, audio } = await reel.evaluate('({ fps: FPS, duration: DURATION, audio: window.AUDIO || null })');

  const frame = async (t, format = 'jpeg') => {
    // seek may return a promise (video clips wait for their frame); then two frames to settle
    await reel.evaluate(`Promise.resolve(seek(${t})).then(() => new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 400); }))`);
    const { data } = await reel.send('Page.captureScreenshot', format === 'png' ? { format: 'png' } : { format: 'jpeg', quality: 94, optimizeForSpeed: true });
    return data;
  };

  fs.mkdirSync(OUT, { recursive: true });
  if (stills) {
    const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const t of stills) {
      const file = path.join(dir, `reel-${t.toFixed(2)}s.png`);
      fs.writeFileSync(file, Buffer.from(await frame(t, 'png'), 'base64'));
      console.log(file);
    }
  } else {
    // The encoder runs in the reel's own tab: one tab, always in front. (A second tab sat in the background,
    // where screenshots hang and Chrome reclaims the codec: "Codec reclaimed due to inactivity".)
    for (const f of ['lib/mp4-muxer.js', 'sound.js', 'encoder.js']) await reel.evaluate(fs.readFileSync(path.join(__dirname, f), 'utf8') + '\n;0');
    const pull = async (size, file) => {
      const parts = [];
      for (let s = 0; s < size; s += 4 << 20) parts.push(Buffer.from(await reel.evaluate(`encPiece(${s}, ${4 << 20})`), 'base64'));
      // Written beside the old file first, so a player holding the old one open can't leave a half-written video
      const tmp = file + '.part';
      fs.writeFileSync(tmp, Buffer.concat(parts));
      try { fs.renameSync(tmp, file); console.log(file, (size / 1048576).toFixed(1) + ' MB'); }
      catch (e) { console.log(`${file} is open somewhere (${e.code}); the new video is at ${tmp}`); }
    };
    if (has('--sound')) {
      await pull(await reel.evaluate(`encSoundWav(${JSON.stringify({ ...audio, duration })})`), path.join(OUT, 'showreel-sound.wav'));
    } else {
      const from = +arg('--from') || 0, to = +arg('--to') || duration;
      const withSound = audio && !has('--mute') && !arg('--from') && !arg('--to');
      await reel.evaluate(`encInit(${JSON.stringify({ w: 1920, h: 1080, fps, bitrate: PART ? 6e6 : 10e6, audio: withSound ? { ...audio, duration } : null })})`);
      const first = Math.round(from * fps), last = Math.round(to * fps), started = Date.now();
      for (let f = first; f < last; f++) {
        const t0 = Date.now(); const jpg = await frame(f / fps); const t1 = Date.now();
        await reel.evaluate(`encAdd("${jpg}")`);
        if (process.env.DEBUG) console.error(`frame ${f}: capture ${t1 - t0} ms, encode ${Date.now() - t1} ms`);
        if ((f - first) % fps === 0) {
          const done = f - first, left = ((Date.now() - started) / Math.max(1, done)) * (last - f) / 60000;
          process.stdout.write(`\r${f}/${last} frames · ${left.toFixed(1)} min left   `);
        }
      }
      const file = arg('--out') ? path.resolve(arg('--out')) : path.join(OUT, arg('--from') || arg('--to') ? `showreel-${from}-${to}.mp4` : PART ? `${PART}.mp4` : 'showreel.mp4');
      console.log();
      await pull(await reel.evaluate('encFinish()'), file);
    }
  }
  reel.ws.close();
  chrome.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
