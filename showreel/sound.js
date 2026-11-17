// The showreel's sound, synthesised (no samples): a warm bed on a 100 BPM grid (pads, plucks,
// a sub and a soft kit) plus effects on the cues showreel.html lists (whoosh, impact, tick, click…).
// renderSound({ duration, bpm, sections, cues, music, musicGain }) → AudioBuffer (48 kHz stereo).
// `music` (a file URL) mixes in a real track under everything and turns the synth bed off.
async function renderSound(a) {
  const SR = 48000, dur = a.duration, bpm = a.bpm || 100, beat = 60 / bpm, bar = beat * 4;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);

  // Master: bus → glue compressor → fade in/out
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(1, 0.4);
  master.gain.setValueAtTime(1, dur - 2.2);
  master.gain.linearRampToValueAtTime(0, dur - 0.05);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
  master.connect(comp).connect(ctx.destination);

  // Reverb from a made impulse
  const verb = ctx.createConvolver();
  const ir = ctx.createBuffer(2, SR * 3, SR);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2);
  }
  verb.buffer = ir;
  const verbIn = ctx.createGain(); verbIn.gain.value = 0.9;
  verbIn.connect(verb).connect(master);

  // Dotted-eighth echo for the plucks
  const delay = ctx.createDelay(2); delay.delayTime.value = beat * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
  const delayIn = ctx.createGain(); delayIn.gain.value = 0.35;
  delayIn.connect(delay); delay.connect(dlp).connect(fb).connect(delay); dlp.connect(master); dlp.connect(verbIn);

  const noiseBuf = ctx.createBuffer(1, SR * 2, SR);
  { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const noise = (t, len) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, Math.random()); s.stop(t + len + 0.05); return s; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const env = (g, t, a1, peak, d1, sustain, rel, end) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a1);
    g.gain.setTargetAtTime(sustain, t + a1, d1);
    g.gain.setValueAtTime(sustain, end);
    g.gain.setTargetAtTime(0.0001, end, rel);
  };

  // Which part of the reel is playing: intro | drive | break | outro
  const sections = a.sections || [{ from: 0, to: dur, level: 'drive' }];
  const levelAt = (t) => (sections.find((s) => t >= s.from && t < s.to) || {}).level || 'drive';

  if (a.music) {
    const data = await (await fetch(a.music)).arrayBuffer();
    const buf = await ctx.decodeAudioData(data);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain(); g.gain.value = a.musicGain ?? 0.55;
    s.connect(g).connect(master); s.start(0, a.musicOffset || 0);
  } else {
    // Fmaj9 · Am7 · Dm9 · Gsus4→G, one bar each
    const chords = [[53, 57, 60, 64, 67], [57, 60, 64, 67, 71], [50, 57, 60, 64, 65], [55, 60, 62, 67, 69]];
    const roots = [41, 45, 38, 43];
    const nBars = Math.ceil(dur / bar);
    for (let b = 0; b < nBars; b++) {
      const t0 = b * bar, ch = chords[b % 4], lvl = levelAt(t0 + 0.01);
      // Pads: two detuned saws per note, low-passed, swelling
      for (const m of ch.slice(0, 4)) {
        for (const det of [-7, 7]) {
          const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det;
          const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lvl === 'drive' ? 1400 : 900; f.Q.value = 0.4;
          const g = ctx.createGain(); env(g, t0, 0.6, 0.03, 0.8, 0.023, 0.5, t0 + bar);
          const p = ctx.createStereoPanner(); p.pan.value = det < 0 ? -0.35 : 0.35;
          o.connect(f).connect(g).connect(p); p.connect(master); p.connect(verbIn);
          o.start(t0); o.stop(t0 + bar + 2.5);
        }
      }
      // Plucks: eighths up and down the chord, an octave up
      const pat = [0, 2, 4, 2, 1, 3, 4, 3];
      for (let i = 0; i < 8; i++) {
        const t = t0 + i * beat / 2;
        if (lvl === 'break' && i > 3) continue;
        const m = ch[pat[i]] + 12;
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m);
        const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = hz(m + 12);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(lvl === 'drive' ? 0.07 : 0.075, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
        const g2 = ctx.createGain(); g2.gain.value = 0.25;
        const p = ctx.createStereoPanner(); p.pan.value = Math.sin(i * 1.3) * 0.5;
        o.connect(g); o2.connect(g2).connect(g); g.connect(p); p.connect(master); p.connect(delayIn); p.connect(verbIn);
        o.start(t); o2.start(t); o.stop(t + 0.4); o2.stop(t + 0.4);
      }
      if (lvl === 'drive' || lvl === 'outro') {
        // Sub: the root, pumping under the kick
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(roots[b % 4]);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0);
        for (let k = 0; k < 4; k++) {
          const tk = t0 + k * beat;
          g.gain.setValueAtTime(0.02, tk); g.gain.linearRampToValueAtTime(lvl === 'outro' ? 0.09 : 0.16, tk + beat * 0.45);
        }
        g.gain.setTargetAtTime(0.0001, t0 + bar, 0.05);
        o.connect(g).connect(master); o.start(t0); o.stop(t0 + bar + 0.3);
      }
      if (lvl === 'drive') {
        for (let k = 0; k < 4; k++) {
          const tk = t0 + k * beat;
          // Kick
          const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, tk); o.frequency.exponentialRampToValueAtTime(46, tk + 0.12);
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, tk); g.gain.linearRampToValueAtTime(0.5, tk + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, tk + 0.38);
          o.connect(g).connect(master); o.start(tk); o.stop(tk + 0.4);
          // Hat on the off-beat
          const th = tk + beat / 2, h = noise(th, 0.06);
          const hf = ctx.createBiquadFilter(); hf.type = 'highpass'; hf.frequency.value = 7500;
          const hg = ctx.createGain(); hg.gain.setValueAtTime(0.05, th); hg.gain.exponentialRampToValueAtTime(0.0001, th + 0.05);
          h.connect(hf).connect(hg).connect(master);
          // Soft clap on 2 and 4
          if (k % 2 === 1) {
            const c = noise(tk, 0.25), cf = ctx.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = 1700; cf.Q.value = 0.9;
            const cg = ctx.createGain(); cg.gain.setValueAtTime(0.0001, tk); cg.gain.linearRampToValueAtTime(0.09, tk + 0.004); cg.gain.exponentialRampToValueAtTime(0.0001, tk + 0.18);
            c.connect(cf).connect(cg); cg.connect(master); cg.connect(verbIn);
          }
        }
      }
    }
  }

  // Effects on the reel's cues
  for (const c of a.cues || []) {
    const t = c.t, v = c.gain ?? 1;
    if (c.kind === 'whoosh') {
      const len = c.len || 0.7, s = noise(t, len), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3800, t + len * 0.6); f.frequency.exponentialRampToValueAtTime(900, t + len);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16 * v, t + len * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-0.6, t); p.pan.linearRampToValueAtTime(0.6, t + len);
      s.connect(f).connect(g).connect(p); p.connect(master); p.connect(verbIn);
    } else if (c.kind === 'riser') {
      const len = c.len || 2, s = noise(t, len), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(6000, t + len);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09 * v, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.03);
      s.connect(f).connect(g); g.connect(master); g.connect(verbIn);
    } else if (c.kind === 'impact') {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.6);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.55 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(g).connect(master); o.start(t); o.stop(t + 1.3);
      const s = noise(t, 0.5), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0.12 * v, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      s.connect(f).connect(ng); ng.connect(master); ng.connect(verbIn);
      // a bell over it
      for (const m of [76, 83]) {
        const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = hz(m);
        const bg = ctx.createGain(); bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(0.035 * v, t + 0.01); bg.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        b.connect(bg); bg.connect(master); bg.connect(verbIn); b.start(t); b.stop(t + 2.3);
      }
    } else if (c.kind === 'tick' || c.kind === 'pop') {
      const o = ctx.createOscillator(); o.type = 'sine';
      const f0 = c.kind === 'pop' ? 520 : 1800;
      o.frequency.setValueAtTime(f0 * (c.pitch || 1), t); o.frequency.exponentialRampToValueAtTime(f0 * 0.6 * (c.pitch || 1), t + 0.06);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((c.kind === 'pop' ? 0.12 : 0.05) * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g); g.connect(master); g.connect(verbIn); o.start(t); o.stop(t + 0.12);
    } else if (c.kind === 'click') {
      const s = noise(t, 0.03), f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.18 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
      s.connect(f).connect(g).connect(master);
    } else if (c.kind === 'key') {
      const s = noise(t, 0.04), f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000 + Math.random() * 1500;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.06 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
      s.connect(f).connect(g).connect(master);
    } else if (c.kind === 'shimmer') {
      [88, 91, 95, 100].forEach((m, i) => {
        const tt = t + i * 0.06, o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.025 * v, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.9);
        o.connect(g); g.connect(master); g.connect(verbIn); o.start(tt); o.stop(tt + 1);
      });
    }
  }
  return ctx.startRendering();
}
