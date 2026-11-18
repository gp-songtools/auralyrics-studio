// AuraLyrics Studio and the GP Song Tools song spec, in a real browser (Playwright + Chromium, which
// are preinstalled in Claude Code sessions; no npm install). AuraLyrics only READS the song spec:
// Lyricpad's lyrics ([tags] removed) can fill the lyric editor. Run once with no song spec and once
// with one; both must work, and AuraLyrics must never change the song spec.
// Tailwind and Google Fonts are stubbed (the CDNs aren't needed to test behaviour). For the layout
// check, build Tailwind 3.4.17 CSS with the config in index.html and pass its path:
//   TAILWIND_CSS=/path/to/out.css node tests/songspec.ui.mjs   (without it, the layout check is skipped)
// Run from the repo root: node tests/songspec.ui.mjs
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = "gpsongtools.songspec.v1";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".md": "text/markdown" };

const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://x").pathname;
    const body = await readFile(join(ROOT, path === "/" ? "index.html" : path));
    res.writeHead(200, { "content-type": TYPES[extname(path) || ".html"] || "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

const TW_CSS = process.env.TAILWIND_CSS ? await readFile(process.env.TAILWIND_CSS, "utf8") : "";
const TW_STUB = "window.tailwind={config:{}};" + (TW_CSS ? `document.head.insertAdjacentHTML("beforeend","<style>"+${JSON.stringify(TW_CSS)}+"</style>");` : "");

const browser = await chromium.launch();
let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log(`ok - ${name}`); } catch (e) { failed++; console.log(`FAIL - ${name}\n  ${e.message}`); }
}

async function open(spec, width = 390) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("dialog", (d) => d.accept());
  await page.route("https://cdn.tailwindcss.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: TW_STUB }));
  await page.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ contentType: "text/css", body: "" }));
  await page.route("https://fonts.gstatic.com/**", (r) => r.fulfill({ body: "" }));
  await page.route("https://static.cloudflareinsights.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: "" }));
  await page.addInitScript(([spec, KEY]) => {
    if (sessionStorage.getItem("init")) return; sessionStorage.setItem("init", "1");
    localStorage.clear();
    if (spec) localStorage.setItem(KEY, spec);
  }, [spec, KEY]);
  await page.goto(base);
  await page.locator("#lrcTextInput").waitFor({ state: "attached" });
  return { page, errors };
}
const stored = (page) => page.evaluate((k) => localStorage.getItem(k), KEY);

await check("no song spec: nothing offered, the editor works as before", async () => {
  const { page, errors } = await open("");
  assert.equal(await page.locator("#specLyr").isHidden(), true);
  assert.match(await page.locator("#specPanel summary").textContent(), /Song spec · empty/);
  await page.fill("#lrcTextInput", "[00:01.00] hello\n[00:02.00] world");
  assert.equal(await stored(page), null, "AuraLyrics never creates a song spec");
  assert.deepEqual(errors, []);
  await page.close();
});

const SPEC = `---
schema_version: 1
title: Paper Lanterns
---

# Song spec

## Lyrics
<!-- song-spec: by=lyricpad at=2026-11-17T14:20Z hash=00000000 -->
[VERSE 1|wistful]
Your name still glows across my screen
A message never sent

[CHORUS]
So I light one for you
`;

await check("with a song spec: Use these lyrics fills the editor, tags removed; the spec is untouched", async () => {
  const { page, errors } = await open(SPEC, 1280);
  assert.match(await page.locator("#specLyr").textContent(), /lyrics from Lyricpad \(3 lines, \[tags\] removed\)/);
  await page.getByRole("button", { name: "Use these lyrics" }).click();
  assert.equal(await page.inputValue("#lrcTextInput"), "Your name still glows across my screen\nA message never sent\n\nSo I light one for you");
  assert.match(await page.locator("#specLyr").textContent(), /In use/);
  // Timestamps added later still count as the same lyrics.
  await page.fill("#lrcTextInput", "[00:01.00] Your name still glows across my screen\n[00:04.00] A message never sent\n\n[00:09.00] So I light one for you");
  assert.match(await page.locator("#specLyr").textContent(), /In use/);
  assert.equal(await stored(page), SPEC, "AuraLyrics only reads: the song spec is byte for byte the same");
  assert.deepEqual(errors, []);
  await page.close();
});

if (!TW_CSS) console.log("skip - layout check (set TAILWIND_CSS to a built Tailwind CSS file)");
else await check("layout: no horizontal scroll at 390 px with the song spec shown", async () => {
  const { page } = await open(SPEC, 390);
  await page.locator("#specLyr").scrollIntoViewIfNeeded();
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.close();
});

await browser.close();
server.close();
console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
