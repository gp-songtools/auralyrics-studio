# AuraLyrics Studio — Music Visualizer & Lyric Video Creator

A single-file, zero-backend browser web application for uploading music creations (**WAV, M4A, MP3**), synchronizing or transcribing embedded lyrics (`.lrc`), customizing reactive Web Audio visualizers, and exporting `.mp4` / `.webm` music videos directly in the browser.

## Key Features

- **Multi-Format Audio Engine**: Upload `.wav`, `.m4a`, or `.mp3` files via drag-and-drop, or generate a built-in 20-second synthesized synthwave demo track offline via `OfflineAudioContext`.
- **AI Speech Recognition & Lyric Syncing**:
  - **In-Browser Whisper AI**: Uses `@xenova/transformers` in WebAssembly with a selectable model (`whisper-tiny.en`, `base.en`, or `small.en`) to transcribe vocals directly from the audio buffer with zero API keys.
  - **Vocal Band Phrase Scanner**: Filters the 300 Hz – 3.4 kHz vocal frequency band to detect vocal phrase onsets and distribute lyrics across the full song duration.
  - **Cloud Whisper API**: Optional Bring-Your-Own-Key support for Groq (`whisper-large-v3`) and OpenAI (`whisper-1`). Audio is compressed to 16 kHz mono WAV before upload (songs up to ~13 min fit the 25 MB limit) and word-level timestamps are requested.
  - **Align to Your Lyrics**: Both Whisper modes can keep the lyric lines you pasted into the editor and use the transcription only for timing (fuzzy word alignment, with unmatched lines interpolated).
  - **Live Browser Listener**: Real-time Web Speech API listener.
  - **Tap-to-Sync Assistant**: Stamp lyric lines on the beat using the `S` or `T` key (leaving `Spacebar` dedicated to Play/Pause), plus full-song stretching and `-1s` / `+1s` offset buttons.
- **13 Reactive Visualizer Modes**: Radial Spectrum, Cyber Skyline Equalizer, Neon Oscilloscope Waveform, Cosmic Vortex, Aurora Ribbons, Dual Infinity, Pulse Rings (bass-reactive core with beat shockwaves), Mirror Bars, Inferno Spectrum, Spiral Burst, an analog VU Meter, LED Meter, and Dot Spectrum.
- **Visualizer Layers**: Stack up to 6 visualizers, each with its own pattern, beat source, reactivity, glow, opacity, palette (or the global one), blend mode (Normal / Add / Screen), mirror X/Y and rotation; add, duplicate, delete, hide and reorder them from the Layers list.
- **Beat Engine, Camera Punch & Flash**: A shared beat engine (2048-point analyser, bands in Hz) tracks the **Kick** (45–300 Hz), **Bass** (20–140 Hz), **Melody** (250–2000 Hz) and **Vocal** (300–3400 Hz) parts of the song, each with a level, an envelope (adjustable release) and onsets from spectral flux with an adaptive threshold. **Camera punch** zooms the frame on beats (lyrics optional) and **Flash** lights it on strong beats, each following a chosen band. Each visualizer layer, the particles, background-image pulse, turntable bounce and lyric pulse each have their own **Reacts to** choice and amount; **Classic** keeps the original bass reaction. The preview and exported videos react identically.
- **Drag-and-Resize Layout Editor**: The app opens in layout-editing mode so you can move and resize each visualizer layer (Viz 1, Viz 2…), each logo (Logo 1…), the Turntable, and the Lyrics directly on the canvas (click **Preview** or press `L` for a clean view), with edge/centre snapping, Shift to keep proportions (logos keep them by default; Shift frees them), Alt to turn snapping off, arrow-key nudging, double-click or per-layer reset, and Reset All. Layouts are stored as fractions of the frame, so they carry across resolutions and aspect ratios, and the editor overlay is never recorded into exports.
- **Saved Settings**: Visualizer, lyric, layout, export and volume settings (and custom turntable cover art, background image and logos) are saved in your browser and restored on reload; **Reset settings** restores the defaults.
- **Custom Palettes**: A palette editor (primary, secondary, accent and background colors) with live preview; save palettes by name under **My Palettes**, update or delete them later.
- **Background Images**: Upload an image behind the visualizer with Cover/Contain/Stretch fit, dim, blur and bass-pulse options; the Background Style (starfield, grid or vignette) is layered on top.
- **Layered Visual Overlays**:
  - **Rotating Vinyl Turntable**: Spinning vinyl platter with concentric grooves, specular sheen, and circular-clipped custom cover art upload.
  - **Logos & Images**: Up to 3 uploaded logos, artist photos or badges above the visualizers and below the lyrics — original (transparency kept), circle or rounded-square shape, optional outline, opacity, rotation, and spin and/or beat pulse (Kick, Bass, Melody, Vocal or Classic), each with its own layout box and optional camera punch.
  - **Floating Particles Overlay**: Bass-reactive Bokeh Orbs, Neon Embers, Musical Notes, and Diamond Stardust, with Drift (any direction), Radial Burst, Implode, Swirl and Vortex motion plus a speed control.
- **Lyric Typography & Color Studio**: 4 display layouts (Kinetic Spotlight, Lower-Third Subtitle, Rolling Teleprompter, Karaoke Wipe), 5 Google Fonts, and custom pickers/presets for active font color, glow color, and upcoming/past line color.
- **Direct Video Export (`.mp4` / `.webm`)** at 1080p (16:9), 720p (16:9), Square (1:1), or Vertical (9:16) at 30 or 60 FPS:
  - **Fast render** (browsers with WebCodecs and the needed encoders, e.g. Chrome and Edge): the song is analysed offline and every frame is drawn and encoded with `VideoEncoder` / `AudioEncoder` (H.264 + AAC in MP4, VP9 + Opus in WebM), then muxed with Mediabunny. Faster than real time, no dropped frames, and the same settings always give the same video. Shows frames done, ETA and a Cancel button.
  - **Real-time recording** (fallback): records the `<canvas>` stream (`captureStream`) plus the Web Audio `MediaStreamDestination` with `MediaRecorder` while the song plays through once.

## Song spec

AuraLyrics reads the GP Song Tools [song spec](https://github.com/gp-songtools/toolsmenu/blob/main/songspec/SPEC.md), one file per song that the tools share in this browser. When Lyricpad has saved lyrics there, **Use these lyrics** fills the LRC editor with them ([tags] removed). AuraLyrics never writes to the song spec. `songspec.js` is a copy of the toolsmenu library (never edit it here). Browser test: `node tests/songspec.ui.mjs` (Playwright; set `TAILWIND_CSS` to a locally built Tailwind file for the layout check).

## Privacy & credits

No server or account of its own. Audio, video export and in-browser Whisper all run on your device. When a fast render starts, the page downloads the open-source [Mediabunny](https://mediabunny.dev) 1.63.0 muxer (MPL-2.0) from jsDelivr; no audio or video is sent anywhere. Cloud transcription sends the audio (16 kHz mono) only to Groq or OpenAI under your own key. The key is kept in memory and forgotten when you close the tab unless you tick **Remember key on this device** (off by default). Pages load Cloudflare Web Analytics, shared by all GP Song Tools, for anonymous visit counts (no cookies; it never sees your audio, lyrics, videos or key). Details and credits: [Privacy & credits](https://gp-songtools.github.io/toolsmenu/privacy.html). Live at https://gp-songtools.github.io/auralyrics-studio/ · changes in [CHANGELOG.md](CHANGELOG.md).

## Running Locally

Because the entire app is self-contained inside `index.html`:
1. Clone or download this repository.
2. Open `index.html` directly in any modern browser (Chrome, Edge, Brave, Firefox, Safari), or serve it with a static server (`npx serve .` or `python3 -m http.server 8000`).
3. Deployable immediately to **GitHub Pages**, **Vercel**, **Netlify**, or **Google Sites**.
