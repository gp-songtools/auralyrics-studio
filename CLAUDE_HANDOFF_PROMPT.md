# Claude Handoff Prompt & GitHub Upload Guide

## Part 1: Copy-Paste Prompt for Claude

Copy and paste the prompt below into Claude (along with uploading `index.html` or connecting your GitHub repository) so Claude has complete architectural context:

```markdown
I am continuing development on **AuraLyrics Studio**, a single-file, browser-based Music Visualizer & Embedded Lyric Video Creator (`index.html`). I have attached the complete current codebase.

### Current Architecture & Tech Stack
- **Single-File Architecture**: All HTML, Tailwind CSS (`cdn.tailwindcss.com`), Google Fonts (`Inter`, `Orbitron`, `Montserrat`, `Cinzel`, `Space Grotesk`), and vanilla JavaScript live inside `index.html` with zero backend dependencies.
- **Web Audio API Pipeline**:
  - Uses `<audio id="audioPlayer">` (without `crossorigin="anonymous"` so local `blob:` URLs never mute) connected to `AudioContext` -> `MediaElementAudioSourceNode` -> `AnalyserNode` (`fftSize = 512`) -> `audioCtx.destination`, plus a `MediaStreamAudioDestinationNode` for video recording.
  - Includes a built-in procedural synthwave demo track generator using `OfflineAudioContext` (`generateSynthwaveDemoAudio()`) that renders a 20-second stereo WAV blob in memory.
- **Lyric Synchronization & AI Transcription Engine**:
  1. **LRC Editor & Parser**: Parses `[mm:ss.xx]` timestamps into `state.lyrics.parsed` and renders them on the canvas. Includes `Fit Full Song` stretching and `-1s` / `+1s` shift buttons.
  2. **Tap-to-Sync Assistant**: Keyboard shortcut `S` (or `T`) stamps the active lyric line (while `Spacebar` is strictly reserved for Play/Pause).
  3. **Auto-Align & Vocal Band Scanner (`300Hz - 3400Hz`)**: Uses `OfflineAudioContext` bandpass filtering and spectral flux onset detection to distribute lyric lines proportionally across the full active duration of the track.
  4. **In-Browser Whisper AI**: Dynamically imports `@xenova/transformers@2.17.2` (`Xenova/whisper-tiny.en`) to transcribe 16kHz resampled audio directly in the browser without API keys.
  5. **Cloud Whisper API**: Supports Groq (`whisper-large-v3`) and OpenAI (`whisper-1`) with `verbose_json` segment timestamps.
  6. **Live Browser Listener**: Uses `webkitSpeechRecognition` / `SpeechRecognition` while playing the track out loud.
- **Canvas Rendering Loop (`renderFrame`)**:
  1. **Backgrounds**: Dynamic 3D Starfield, Dark Studio Vignette, Pure Pitch Black (OLED), or Cyber Retro Grid.
  2. **6 Visualizer Modes**: `radial` (Radial Spectrum), `equalizer` (Cyber Skyline), `waveform` (Neon Oscilloscope), `nebula` (Cosmic Vortex), `aurora` (Aurora Ribbons), and `dualring` (Dual Infinity) with 6 color palettes.
  3. **Floating Particles Overlay**: Configurable density (`15-100`) and styles (`orbs`, `sparks`, `notes`, `stardust`) reactive to bass and mid frequencies.
  4. **Rotating Vinyl Turntable**: Center spinning record platter with concentric vinyl grooves, diagonal specular light sheen, adjustable spin speed (`0.2x-3.0x`) and scale (`60%-150%`), and circular-clipped custom cover art (`state.visualizer.turntableImage`).
  5. **Embedded Lyrics Renderer**: 4 layouts (`kinetic`, `subtitle`, `teleprompter`, `karaoke`) with custom pickers and presets for Active Font Color (`fontColor`), Highlight/Glow Color (`highlightColor`), and Secondary/Upcoming Line Color (`secondaryColor`), plus bass-reactive bounce and frosted glass pill backdrops.
- **Video Export Engine**:
  - Combines `visualizerCanvas.captureStream(fps)` + `mediaStreamDestNode.stream` into `MediaRecorder`.
  - Supports `.mp4` (`video/mp4;codecs=avc1.42E01E,mp4a.40.2` / `h264`) and `.webm` (`vp9`/`vp8`) at `1920x1080` (16:9), `1280x720` (16:9), `1080x1080` (1:1), and `1080x1920` (9:16) at 30 or 60 FPS.

### Guidelines for Our Session
1. Preserve all existing features, controls, keyboard shortcuts (`Space` for play/pause, `S`/`T` for lyric stamping), and audio routing rules unless I explicitly ask to change them.
2. Keep the application self-contained (or let me know if we are modularizing into separate files).
3. Please review the attached `index.html` and confirm you understand the state structure and rendering pipeline, then wait for my first feature request.
```

---

## Part 2: How to Upload Your Code to GitHub

### Option A: Upload via Your Web Browser (No Terminal Required — Takes 1 Minute)
1. Download and unzip `auralyrics_studio_github_repo.zip` (provided in chat).
2. Go to [github.com/new](https://github.com/new) and sign in.
3. Under **Repository name**, type `auralyrics-studio`.
4. Choose **Public** (or **Private**) and click **Create repository**.
5. On the next screen, click the link that says **"uploading an existing file"**.
6. Drag and drop `index.html`, `README.md`, `.gitignore`, and `CLAUDE_HANDOFF_PROMPT.md` into the browser window.
7. Click **Commit changes** at the bottom.
8. *(Optional — Free Live Hosting)*: Go to your repository's **Settings** → **Pages** (on the left sidebar) → under **Branch**, select `main` and click **Save**. Within 60 seconds, your app will be live on the web at `https://<your-username>.github.io/auralyrics-studio/`!

### Option B: Upload via Git Command Line (Terminal)
If you have Git installed on your computer, unzip `auralyrics_studio_github_repo.zip`, open your terminal in that folder, and run:

```bash
git init
git add index.html README.md .gitignore CLAUDE_HANDOFF_PROMPT.md
git commit -m "Initial commit: AuraLyrics Studio music visualizer and lyric video maker"
git branch -M main
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/auralyrics-studio.git
git push -u origin main
```
