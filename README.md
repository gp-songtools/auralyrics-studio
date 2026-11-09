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
- **13 Reactive Visualizer Modes**: Radial Spectrum, Cyber Skyline Equalizer, Neon Oscilloscope Waveform, Cosmic Vortex, Aurora Ribbons, Dual Infinity, Pulse Rings (bass-reactive core with beat shockwaves), Mirror Bars, Inferno Spectrum, Spiral Burst, an analog VU Meter, LED Meter, and Dot Spectrum, plus a Visualizer Opacity slider.
- **Drag-and-Resize Layout Editor**: Click **Layout** (or press `L`) above the preview to move and resize the Visualizer, Turntable, and Lyrics layers directly on the canvas, with edge/centre snapping, Shift to keep proportions, arrow-key nudging, and per-layer reset. Layouts are stored as fractions of the frame, so they carry across resolutions and aspect ratios, and the editor overlay is never recorded into exports.
- **Layered Visual Overlays**:
  - **Rotating Vinyl Turntable**: Spinning vinyl platter with concentric grooves, specular sheen, and circular-clipped custom cover art upload.
  - **Floating Particles Overlay**: Bass-reactive Bokeh Orbs, Neon Embers, Musical Notes, and Diamond Stardust.
- **Lyric Typography & Color Studio**: 4 display layouts (Kinetic Spotlight, Lower-Third Subtitle, Rolling Teleprompter, Karaoke Wipe), 5 Google Fonts, and custom pickers/presets for active font color, glow color, and upcoming/past line color.
- **Direct Video Export (`.mp4` / `.webm`)**: Records the HTML5 `<canvas>` stream (`captureStream`) merged with the Web Audio `MediaStreamDestination` at 1080p (16:9), 720p (16:9), Square (1:1), or Vertical (9:16) at 30 or 60 FPS.

## Running Locally

Because the entire app is self-contained inside `index.html`:
1. Clone or download this repository.
2. Open `index.html` directly in any modern browser (Chrome, Edge, Brave, Firefox, Safari), or serve it with a static server (`npx serve .` or `python3 -m http.server 8000`).
3. Deployable immediately to **GitHub Pages**, **Vercel**, **Netlify**, or **Google Sites**.
