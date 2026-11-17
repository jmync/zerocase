# Portfolio showreel

A 77 s, 1920 × 1080 showreel of three projects (BUKVEN, SpecsAI Studio, NKMACB) for **Jo Mary Ynna Albasin, AI Product Engineer**.
It follows the portfolio site's look: Archivo headlines, one selected word per title, square tags, a dot grid, and the portrait in a selection frame.

```
node showreel/render.js                      # → out/showreel.mp4 (H.264 + AAC), about 10 min
node showreel/render.js --stills 12,34.5     # PNG stills → out/stills/
node showreel/render.js --from 28.8 --to 50.4  # one stretch, no sound
node showreel/render.js --sound              # sound track only → out/showreel-sound.wav
node showreel/render.js --part buk           # one project alone (buk | specs | nkma) → out/<part>.mp4, 6 Mbps for the web
```

No ffmpeg is needed. Headless Chrome steps `showreel.html` one frame at a time. In the same tab, `encoder.js` encodes the frames with WebCodecs and `lib/mp4-muxer.js` (MIT) writes the MP4. Keep it to one tab: Chrome stalls screenshots of background tabs and reclaims their codecs. The music and effects are synthesised in `sound.js`. To use a real track instead, set `AUDIO.music` to its file URL in `showreel.html`, and the synth bed turns off.

Open `showreel.html?t=40` in Chrome to see one moment.

## Timeline (100 BPM, one bar = 2.4 s)

| Time | Section |
|---|---|
| 0–7.2 | Intro: "Building software with quality built in.", a typed line, the three projects |
| 7.2–28.8 | 01 BUKVEN: card, app clips, admin portal, brand kit |
| 28.8–50.4 | 02 SpecsAI Studio: card, lifecycle, agent office, blueprint, agent build, runner, wall |
| 50.4–69.6 | 03 NKMACB: card, host control (crowning), roulettes, CB Live, promo clip, event-kit wall |
| 69.6–76.8 | End card: the portrait as a selected layer, "Let's build together.", links |

## Sources

- `shots/specsai/`: captures of the running SpecsAI Studio. `notes.md` has the facts and where they came from.
- `shots/nkmacb/`: host-control screens from the build sessions, the live site, and the repo's graphics. `notes.md` explains each one. The test scores on the host screens are cropped out (the official result is in `23-finals-results.png`).
- `media/bukven/`: portal screenshots and the brand kit, copied from `explore-bukidnon-app/docs`. The app clips are read straight from `explore-bukidnon-app/docs/brand/social/campaign/out/bukven-teaser-youtube.mp4`.
- `media/nkmacb/final-waltz.mp4`: the Finals promo from the nakama-battle repo. Git-ignored, so copy it back from the repo if it's missing.
- `media/me/`: the portrait and its cut-out mask.

## On the site

The Projects section (`index.html`, `#projects`) plays one video per project from `assets/projects/`: `bukven.mp4`, `specsai.mp4` and `nkmacb.mp4`, with `.jpg` posters. To update one, re-render it with `--part buk|specs|nkma`, then copy `out/<part>.mp4` over the matching file. The poster is a PNG still (`--part <p> --stills <t>`) saved as a JPEG.
