# Tests

Plain node scripts (no test runner). They need `playwright` with Chromium installed and exit non-zero on failure.

```
node tests/viz-layers-core.js   # layer stack data model, migration, limits, runtime state
node tests/viz-layers-ui.js     # layer list UI, layout editor, round trip, export determinism, layout, perf
```

`tests/serve-and-stub.js` serves the repo on `http://localhost` and stubs the CDN / API hosts (the sandbox cannot reach them).

## Real layout (optional, recommended)

Without CSS the Tailwind CDN is stubbed out and nothing is laid out. To get real layout, build the CSS once
(and again after changing markup in `index.html`) and point `TAILWIND_CSS` at it:

```
sh tests/build-css.sh                       # writes tests/.tailwind.css (Tailwind 3.4.17, config mirrors index.html)
TAILWIND_CSS=tests/.tailwind.css node tests/viz-layers-ui.js
```

`viz-layers-ui.js` builds the CSS itself when `TAILWIND_CSS` is not set and `npx` can fetch tailwindcss; layout and
pointer-drag checks are skipped if no CSS is available. Screenshots go to `$SHOT_DIR` (default: the OS temp dir).
