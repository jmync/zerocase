// Runs inside the showreel page itself (render.js injects it after lib/mp4-muxer.js and sound.js), so the encoder lives
// in the tab that's in front: Chrome reclaims codecs from background tabs ("Codec reclaimed due to inactivity").
// Frames arrive as JPEG (base64), leave as H.264 in an MP4; the sound is made from the reel's cue list and encoded as AAC.
let encMuxer, encVideo, encFps, encCount = 0, encFailed = null, encResult = null;

async function encInit({ w, h, fps, bitrate, audio }) {
  encFps = fps;
  encMuxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: 'avc', width: w, height: h, frameRate: fps },
    audio: audio ? { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 } : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });
  encVideo = new VideoEncoder({ output: (chunk, meta) => encMuxer.addVideoChunk(chunk, meta), error: (e) => (encFailed = e.message) });
  encVideo.configure({ codec: 'avc1.640032', width: w, height: h, bitrate, framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } });
  if (audio) {
    const buf = await renderSound(audio); // sound.js: an AudioBuffer, 48 kHz stereo
    const aenc = new AudioEncoder({ output: (chunk, meta) => encMuxer.addAudioChunk(chunk, meta), error: (e) => (encFailed = e.message) });
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }); // Chrome's AAC: 96/128/160/192 kbps only
    const L = buf.getChannelData(0), R = buf.getChannelData(1), N = 4800;
    for (let i = 0; i < buf.length; i += N) {
      const n = Math.min(N, buf.length - i), data = new Float32Array(n * 2);
      data.set(L.subarray(i, i + n), 0); data.set(R.subarray(i, i + n), n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(i / 48 * 1000), data });
      aenc.encode(ad); ad.close();
    }
    await aenc.flush(); aenc.close();
  }
  return 'ok';
}

async function encAdd(b64) {
  if (encFailed) throw new Error(encFailed);
  const blob = await (await fetch('data:image/jpeg;base64,' + b64)).blob();
  const bmp = await createImageBitmap(blob);
  const frame = new VideoFrame(bmp, { timestamp: Math.round(encCount * 1e6 / encFps), duration: Math.round(1e6 / encFps) });
  encVideo.encode(frame, { keyFrame: encCount % (encFps * 2) === 0 });
  frame.close(); bmp.close(); encCount++;
  while (encVideo.encodeQueueSize > 6) await new Promise((r) => encVideo.addEventListener('dequeue', r, { once: true }));
  return encCount;
}

async function encFinish() {
  await encVideo.flush(); encVideo.close();
  if (encFailed) throw new Error(encFailed);
  encMuxer.finalize();
  encResult = new Uint8Array(encMuxer.target.buffer);
  return encResult.length;
}

// The finished file goes back to node in base64 pieces
function encPiece(start, size) {
  const part = encResult.subarray(start, start + size);
  let s = '';
  for (let i = 0; i < part.length; i += 0x8000) s += String.fromCharCode.apply(null, part.subarray(i, i + 0x8000));
  return btoa(s);
}

// Sound alone, for listening while editing: a 16-bit WAV
async function encSoundWav(audio) {
  const buf = await renderSound(audio);
  const n = buf.length, out = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, 48000, true); out.setUint32(28, 48000 * 4, true);
  out.setUint16(32, 4, true); out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, n * 4, true);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
  }
  encResult = new Uint8Array(out.buffer);
  return encResult.length;
}
