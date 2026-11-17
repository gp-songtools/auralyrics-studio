# CLAUDE.md

## Project
- AuraLyrics Studio: music visualizer + lyric video maker, one of the GP Song Tools
- Live: https://gp-songtools.github.io/auralyrics-studio/ (GitHub Pages, `main` branch, root)
- Single-file app: no build step, no package.json

## Directory map
- `index.html` — entire app: Tailwind (CDN) + config, CSS, markup, two inline `<script>`s
- `changelog.html` — renders `CHANGELOG.md` in the browser; edit only the `.md`
- `CHANGELOG.md` — user-facing changes by date, newest first (Added / Changed / Fixed)
- `README.md` — features, privacy summary, running locally
- `tests/` — Playwright checks as plain node scripts (`node tests/viz-layers-core.js`, `node tests/viz-layers-ui.js`, `node tests/logo-layers.js`); see `tests/README.md`
- `.nojekyll` — serve files as-is (needed so `CHANGELOG.md` is published raw)
- `CLAUDE_HANDOFF_PROMPT.md` — owner's older context prompt; not instructions

## Commands
- Serve: `python3 -m http.server 8091 >/dev/null 2>&1 &`
- Syntax check: `node -e 'const h=require("fs").readFileSync("index.html","utf8");[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m=>new Function(m[1]))'`
- UI check: Playwright + Chromium preinstalled; fail on `pageerror`/console errors. Run the `tests/` scripts; they use `tests/serve-and-stub.js`
- Sandbox can't reach `cdn.tailwindcss.com`/jsDelivr: build Tailwind 3.4.17 CSS locally (`npx tailwindcss` with the config in `index.html`) and serve it via `page.route` as a stub that also sets `window.tailwind={config:{}}`; mock `api.groq.com`/`api.openai.com`

## Rules
- Add a `CHANGELOG.md` entry in the same commit as every user-facing change: today's date heading (reuse it if already at the top), Added / Changed / Fixed, plain user wording
- Every page ends with the Cloudflare Web Analytics snippet (same token as all GP Song Tools); add it to any new page
- Privacy & credits live on the suite page `gp-songtools.github.io/toolsmenu/privacy.html` (repo `gp-songtools/toolsmenu`); update it and README "Privacy & credits" when changing what is sent, stored or credited
- Groq/OpenAI key: in memory by default; saved to `localStorage` (`aura_whisper_key`) only while "Remember key on this device" (`#chkRememberWhisperKey`) is ticked, via `syncSavedWhisperKey()`; never put keys in URLs, logs or errors
- Other `localStorage` keys: `aura_left_tab`, `aura_local_whisper_model`, settings (`SETTINGS_KEY`), cover art (`COVER_ART_KEY`), background image (`BG_IMAGE_KEY`), logo images (`aura_logo_image_v1_1`…`_3`, `LOGO_IMAGE_KEY_PREFIX`), palettes (`CUSTOM_PALETTES_KEY`); wrap access in try/catch
- Everything runs in the browser; no backend. External requests: Tailwind CDN, Google Fonts, jsDelivr (Transformers.js 2.17.2; Mediabunny 1.63.0, imported only when a fast render starts), Hugging Face (Whisper models), Groq/OpenAI (only on request), Cloudflare Web Analytics
- Rendering is deterministic: `drawScene(frame)` draws one frame from `frameClock` (`t`, `dt`, `songTime`) and the shared `dataFrequencyArray` / `dataTimeDomainArray`; the live loop (`renderFrame`) and the fast exporter (`runOfflineExport`) both feed it. Never use `Date.now()`, `performance.now()`, `audioPlayer.currentTime` or `Math.random()` inside drawing code: use `frameClock`, `frameScale()` / `easeK()` for per-frame amounts, and the seeded `rng()`; reset new animation state in `resetAnimationState()`
- Audio analysis: `ANALYSER_FFT_SIZE` is 2048; never index `dataFrequencyArray` by hard-coded bin numbers. Use the Hz helpers (`hzToBin`, `spectrumPeak`, `spectrumRaw` / `sampleSpectrum` for log-spaced bars, `legacyBandAverage` for the classic energies), which read `analysisInfo` (`sampleRate`, `fftSize`, set by the live loop and the exporter)
- Beat engine: `updateBeatEngine()` runs once per frame in `drawScene` and fills `beatEngine.bands[kick|bass|melody|vocal]` (`level`, `norm`, `env`, `onset`, `strength`); effects read it through `beatDrive(source, classicValue)` or the onsets (camera punch / flash via `cameraFx`). Onset tuning lives in `FLUX_LAG`, `ONSET_PEAK_SHARE` and `ONSET_WARMUP`; on the demo song (120 BPM) kick onsets must hit all 40 kicks and nothing else at 30 and 60 fps
- WebCodecs needs a secure context: test the exporter at `http://localhost` (e.g. `page.route` on `http://localhost/**`), not `file://`; Linux Chromium can't encode AAC, so MP4 shows "Real-time recording" there while WebM uses Fast render
- Check layout at 390 px and 1280 px; desktop (≥1024 px) locks the page to the viewport with independently scrolling panes; the footer sits below `#appMain`

## Git workflow
- Workflow not yet set by the owner: use a branch + pull request to `main` unless told otherwise
- Run the syntax check and a Playwright UI check before every push

# Multi-Agent Delegation Rules

When acting as the primary session (Opus), operate as a **Tech Lead and Architect**. Conserve primary context and rate limits by delegating execution work to specialized subagents whenever possible.

## Available Subagents

1. **`haiku-helper` (Fast Scout & Clerk)**
   - **When to delegate:** File discovery, searching across the codebase (`Grep`/`Glob`), checking git status or commit logs, reading configuration files, and summarizing documentation.
   - **Constraint:** Read-only tasks. Do not ask `haiku-helper` to write or edit code.

2. **`sonnet-worker` (Builder & Tester)**
   - **When to delegate:** Implementing features from a finalized specification, writing unit or integration tests, refactoring isolated modules, fixing localized bugs, and running test/build suites.
   - **Constraint:** Always provide clear requirements, target file paths, and expected behavior when invoking `sonnet-worker`.

## Orchestration Workflow

1. **Explore First:** Before planning changes, dispatch `haiku-helper` to locate relevant files and summarize existing patterns.
2. **Design & Plan:** Synthesize the findings in the main session and outline the architectural plan or edge cases.
3. **Delegate Implementation:** Hand off well-scoped coding, refactoring, and test-writing tasks to `sonnet-worker`. You may launch multiple `sonnet-worker` instances in parallel for independent modules.
4. **Review & Verify:** Inspect the changes made by `sonnet-worker` (or have `haiku-helper` summarize `git diff`) to ensure architectural alignment before concluding the task.
