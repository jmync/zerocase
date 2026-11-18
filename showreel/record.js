// Records real moments of the NKMACB site (nakama-battle.onrender.com) into clips for the showreel, 1920 × 1080, no sound:
//   node showreel/record.js site     → media/nkmacb/site.mp4    the info page: the seal pulses, a click breaks it open, the hero comes up
//   node showreel/record.js reveal   → media/nkmacb/reveal.mp4  host control's Finals: CROWN THE WINNER → the scores climb → the crown lands
//   node showreel/record.js judging  → media/nkmacb/judging.mp4 the judges portal on the Group Clash: the dashboard → the 8
//                                       matchups → Kurezee's marks on the rubric → save → My Scores, all 16 ranked
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

// The stand-in API. Reveal: the Finals as it ended.
const FINALS = { ok: true, matchups: [{ teams: [{ team: 'Kurezee', final: 97.5 }, { team: 'TN🔥C', final: 94.2 }], tie: false }], skipped: [] };

// Judging: the real Group Clash, from the NKMA repo's scoring sheet (logo-export/gc-scoring, made from the production
// backup of 2026-08-09) and the real schedule (judging Aug 1–9): the 8 groups, the artist each drew, both teams, and the
// panel's average out of 100. The finalists' entries carry their real covers, rosters and songs (motion/road-to-finals).
// The judge is a "Guest Judge" (no real judge's name on demo marks). Their 15 earlier scores are each team's real panel
// average, at the half point the portal stores; the clip scores the 16th, Kurezee (98.4 on the night), live.
const GC = [
  ['Trash Panda', 'Ado', [['Kurezee', 98.4], ['恋B2', 95.7]]],
  ['Red Panda', 'Coldrain', [['Meowsic', 88.6], ['IBUPROFEN', 89.8]]],
  ['Sun Bear', 'One Ok Rock', [['Eyi Tzantzas', 89.3], ['COF FINAL BREATH', 88.7]]],
  ['Bamboo', 'biz×ZERA', [['iriAi (IridescentAi)', 77.3], ['Y4K', 89.3]]],
  ['Moonbear', 'Reol', [['瑠月☾', 88.7], ['TN🔥C', 91.7]]],
  ['Pandacore', 'Nano ナノ', [['B-381', 90.1], ['Meniex', 77.8]]],
  ['Kungfu', 'Kalafina', [['ærithm', 94.4], ['ᎮᏒᎷᏦᏒ', 96.4]]],
  ['Roly-Poly', 'DUSTCELL', [['RuMuRu', 86.4], ['Tûņćh Læbłə', 84.2]]],
];
const LIVE_ENTRY = 'Kurezee';
const COVER = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'media', 'nkmacb', 'covers', f)).toString('base64');
const ENTRY = {
  kurezee: { cover: 'clash-kurezee.jpg', credits: 'TOT Musica\nOriginal · Ado', roster: ['_Herru_', 'keiss_', 'H_nk13', 'mintsuchi'] },
  'tn🔥c': { cover: 'clash-tnc.jpg', credits: 'Phanto(me) ゆーれいずみー\nOriginal · Reol', roster: ['aatloz', 'Kyouko_dayo', 'breadtasticyun', 'nachinchona'] },
};
const JUDGE = 'Guest Judge';
const GMT8 = (s) => s + ':00+08:00';
const NOW = Date.parse(GMT8('2026-08-06T21:40')); // judging week, three days before the results
const STAGES = [
  ['Qualifiers', 'done', '2026-07-12T00:00', '2026-07-19T23:59'],
  ['Group Clash', 'live', '2026-08-01T00:00', '2026-08-09T23:59'],
  ['Showdown', 'locked', '2026-08-23T00:00', '2026-08-30T23:59'],
  ['Semi-Finals', 'locked', '2026-09-23T00:00', '2026-09-26T23:59'],
  ['Finals', 'locked', '2026-10-20T00:00', '2026-10-24T23:59'],
].map(([name, status, a, b], i) => ({ name, order: i + 1, status, phases: { judge: { start: GMT8(a), end: GMT8(b) } } }));
const saved = GC.flatMap(([, , teams]) => teams).filter(([team]) => team !== LIVE_ENTRY)
  .map(([team, avg], i) => ({ stage: 'Group Clash', team, total: Math.round(avg * 2) / 2, feedback: '', updatedAt: new Date(Date.parse(GMT8('2026-08-02T19:00')) + i * 5.3e6).toISOString() }));

function fakeApi(url, method, body) {
  const u = new URL(url), p = u.pathname;
  if (p === '/api/host/login') return { ok: true };
  if (p === '/api/host/stage') return { ok: true, stage: 'Finals' };
  if (p === '/api/host/state') return method === 'GET' ? { ok: true, state: {} } : { ok: true };
  if (p === '/api/host/results') return FINALS;
  if (p === '/api/live' && SCENE === 'reveal') {
    const now = Date.now(), iso = (ms) => new Date(ms).toISOString();
    return {
      ok: true, configured: true, serverNow: now,
      stages: [{ name: 'Finals', order: 5, status: 'live', phases: { judge: { start: iso(now - 36e5), end: iso(now + 2 * 864e5) } } }],
      entries: [['Kurezee', '/finals/kurezee.webp'], ['TN🔥C', '/finals/tnc.webp']].map(([team, previewImage]) => ({ stage: 'Finals', team, previewImage, smuleLink: '', references: [], credits: '', scriptLink: '' })),
      assignments: [{ stage: 'Finals', team: 'Kurezee', result: 'Lust', group: '' }, { stage: 'Finals', team: 'TN🔥C', result: 'Envy', group: '' }],
      teams: [],
    };
  }
  if (p === '/api/live') {
    return {
      ok: true, configured: true, serverNow: NOW, appTz: '+08:00', stages: STAGES,
      entries: GC.flatMap(([, , teams]) => teams.map(([team]) => {
        const e = ENTRY[team.toLowerCase()] || {};
        return { stage: 'Group Clash', team, smuleLink: '', references: [], credits: e.credits || '', scriptLink: '' };
      })),
      assignments: GC.flatMap(([group, artist, teams]) => teams.map(([team]) => ({ stage: 'Group Clash', team, result: artist, group }))),
      teams: Object.entries(ENTRY).map(([k, e]) => ({ team: GC.flatMap(([, , t]) => t).find(([n]) => n.toLowerCase() === k)[0], roster: e.roster })),
    };
  }
  if (p === '/api/judge/roster') return { ok: true, judges: [{ name: JUDGE }] };
  if (p === '/api/judge/login') return { ok: true, name: JUDGE };
  if (p === '/api/judge/scores') return { ok: true, scores: saved, locked: [], notOpen: false, closed: false };
  if (p === '/api/judge/score' && method === 'POST') {
    try {
      const s = JSON.parse(body || '{}');
      const total = ['VocalDelivery', 'BlendHarmony', 'PitchTune', 'TimingSync', 'HarmonyAdlibs', 'BattleVibe', 'EmotionalDelivery', 'OverallImpression', 'RecordingQuality'].reduce((t, k) => t + (Number(s[k]) || 0), 0);
      saved.push({ ...s, total, updatedAt: new Date(NOW).toISOString() });
    } catch {}
    return { ok: true };
  }
  if (p === '/api/entries/image') {
    const e = ENTRY[(u.searchParams.get('team') || '').toLowerCase()];
    return { ok: true, image: e ? COVER(e.cover) : '' };
  }
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
      const body = Buffer.from(JSON.stringify(fakeApi(request.url, request.method, request.postData))).toString('base64');
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
  const waitFor = async (js, ms = 30000) => {
    for (let t = 0; t < ms; t += 200) { try { const r = await rectOf(js); if (r) return r; } catch {} await sleep(200); }
    // leave a picture of where it got stuck, for debugging
    try { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(os.tmpdir(), 'record-stuck.png'), Buffer.from(data, 'base64')); } catch {}
    throw new Error('never appeared: ' + js + ' (screenshot: ' + path.join(os.tmpdir(), 'record-stuck.png') + ')');
  };
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
  } else if (SCENE === 'judging') {
    await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `try { sessionStorage.setItem('nkma_judge_pass', 'showreel'); sessionStorage.setItem('nkma_judge_name', ${JSON.stringify(JUDGE)}); } catch (e) {}` });
    await send('Page.navigate', { url: SITE + '/judges-portal' });
    const click = async (p) => { await mouse('mousePressed', p.x, p.y); await mouse('mouseReleased', p.x, p.y); };
    const wheel = async (p, dy, n) => { for (let i = 0; i < n; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: p.x, y: p.y, deltaX: 0, deltaY: dy }); await sleep(45); } };
    // sidebar items (the innermost element with that label)
    const NAV = (label) => `[...document.querySelectorAll('button, a, [role=button]')].filter((b) => new RegExp('^\\\\s*' + ${JSON.stringify(label)}).test(b.textContent)).pop()`;
    // the dashboard: 15 of 16 scored, the spread, the recent list
    await waitFor("document.querySelector('.jp-prog-top')", 60000);
    await sleep(3500);
    await mouse('mouseMoved', rest.x, rest.y);
    await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    await sleep(900);
    const chart = await waitFor("document.querySelector('.jp-chart')");
    await glide(rest, chart, 30); await sleep(900);
    const recent = await waitFor("document.querySelector('.jp-rlist')");
    await glide(chart, recent, 24);
    await wheel(recent, 70, 10); await sleep(500); await wheel(recent, -70, 10);
    await sleep(500);
    // Score Entries: the eight matchups down the rail
    const tab = await waitFor(NAV('Score Entries'));
    await glide(recent, tab, 18); await sleep(250);
    await click(tab);
    await waitFor("document.querySelector('.jp-scorebtn')", 10000);
    await sleep(1300);
    const list = await waitFor("document.querySelector('.jp-elist')");
    await glide(tab, list, 16);
    await wheel(list, 60, 16); await sleep(700); await wheel(list, -60, 16);
    await sleep(700);
    // Kurezee heads the rail: score it
    const scoreBtn = await waitFor("document.querySelector('.jp-scorebtn')");
    await glide(list, scoreBtn, 20); await sleep(250);
    await click(scoreBtn);
    await waitFor("document.querySelector('.jp-crit-num')", 10000);
    await sleep(900);
    // the marks, criterion by criterion: typed into each box, the running total climbing with them (98.5)
    const marks = ['19.5', '10', '10', '10', '14.5', '10', '9.5', '5', '10'];
    let at = scoreBtn;
    for (let i = 0; i < marks.length; i++) {
      await evaluate(`document.querySelectorAll('.jp-crit-num')[${i}].scrollIntoView({ block: 'center' })`);
      await sleep(120);
      const box = await rectOf(`document.querySelectorAll('.jp-crit-num')[${i}]`);
      await glide(at, box, 8); at = box;
      await mouse('mousePressed', box.x, box.y); await mouse('mouseReleased', box.x, box.y);
      for (const ch of marks[i]) { await send('Input.insertText', { text: ch }); await sleep(70); }
      await sleep(220);
    }
    await evaluate("document.querySelector('.jp-fbox').scrollIntoView({ block: 'center' })");
    await sleep(200);
    const fb = await rectOf("document.querySelector('.jp-fbox')");
    await glide(at, fb, 10);
    await mouse('mousePressed', fb.x, fb.y); await mouse('mouseReleased', fb.x, fb.y);
    for (const word of 'Fearless from the first line. The blend in the last chorus was razor tight, and the ad-libs gave TOT Musica real bite.'.split(/(?= )/)) { await send('Input.insertText', { text: word }); await sleep(55); }
    await sleep(500);
    const saveBtn = await waitFor(`[...document.querySelectorAll('.jp-btn.primary')].find((b) => /Save score/.test(b.textContent))`, 5000);
    await glide(fb, saveBtn, 12); await sleep(200);
    await click(saveBtn);
    const confirm = await waitFor("document.querySelector('.jp-confirm-btn.confirm')", 5000);
    await sleep(900);
    await glide(saveBtn, confirm, 12); await sleep(200);
    await click(confirm);
    // the sheet closes itself once saved: the rail ticks over to 16 of 16
    await sleep(1800);
    // then My Scores: the whole Group Clash ranked
    const mineBtn = await waitFor(NAV('My Scores'), 5000);
    await glide(confirm, mineBtn, 18); await sleep(250);
    await click(mineBtn);
    await waitFor("document.querySelector('.jp-podium')", 8000);
    await sleep(1400);
    const pod = await waitFor("document.querySelector('.jp-podium')");
    await glide(mineBtn, pod, 24);
    await wheel(pod, 60, 18);
    await sleep(1600);
    await mouse('mouseMoved', W * 0.97, H * 0.97);
    await sleep(800);
  } else throw new Error('scene: site, reveal or judging');

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
  if (SCENE !== 'site') await send('Fetch.disable');
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
