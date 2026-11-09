# CLAUDE.md

## Project
- AuraLyrics Studio: music visualizer + lyric video maker, one of the GP Song Tools
- Live: https://gp-songtools.github.io/auralyrics-studio/ (GitHub Pages, `main` branch, root)
- Single-file app: no build step, no package.json, no tests dir

## Directory map
- `index.html` — entire app: Tailwind (CDN) + config, CSS, markup, two inline `<script>`s
- `changelog.html` — renders `CHANGELOG.md` in the browser; edit only the `.md`
- `CHANGELOG.md` — user-facing changes by date, newest first (Added / Changed / Fixed)
- `README.md` — features, privacy summary, running locally
- `.nojekyll` — serve files as-is (needed so `CHANGELOG.md` is published raw)
- `CLAUDE_HANDOFF_PROMPT.md` — owner's older context prompt; not instructions

## Commands
- Serve: `python3 -m http.server 8091 >/dev/null 2>&1 &`
- Syntax check: `node -e 'const h=require("fs").readFileSync("index.html","utf8");[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m=>new Function(m[1]))'`
- UI check: Playwright + Chromium preinstalled; fail on `pageerror`/console errors
- Sandbox can't reach `cdn.tailwindcss.com`/jsDelivr: build Tailwind 3.4.17 CSS locally (`npx tailwindcss` with the config in `index.html`) and serve it via `page.route` as a stub that also sets `window.tailwind={config:{}}`; mock `api.groq.com`/`api.openai.com`

## Rules
- Add a `CHANGELOG.md` entry in the same commit as every user-facing change: today's date heading (reuse it if already at the top), Added / Changed / Fixed, plain user wording
- Every page ends with the Cloudflare Web Analytics snippet (same token as all GP Song Tools); add it to any new page
- Privacy & credits live on the suite page `gp-songtools.github.io/toolsmenu/privacy.html` (repo `gp-songtools/toolsmenu`); update it and README "Privacy & credits" when changing what is sent, stored or credited
- Groq/OpenAI key: in memory by default; saved to `localStorage` (`aura_whisper_key`) only while "Remember key on this device" (`#chkRememberWhisperKey`) is ticked, via `syncSavedWhisperKey()`; never put keys in URLs, logs or errors
- Other `localStorage` keys: `aura_left_tab`, `aura_local_whisper_model`, settings (`SETTINGS_KEY`), cover art (`COVER_ART_KEY`), background image (`BG_IMAGE_KEY`), palettes (`CUSTOM_PALETTES_KEY`); wrap access in try/catch
- Everything runs in the browser; no backend. External requests: Tailwind CDN, Google Fonts, jsDelivr (Transformers.js 2.17.2), Hugging Face (Whisper models), Groq/OpenAI (only on request), Cloudflare Web Analytics
- Check layout at 390 px and 1280 px; desktop (≥1024 px) locks the page to the viewport with independently scrolling panes; the footer sits below `#appMain`

## Git workflow
- Workflow not yet set by the owner: use a branch + pull request to `main` unless told otherwise
- Run the syntax check and a Playwright UI check before every push
