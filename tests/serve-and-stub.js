// Shared helper for the plain-node UI checks: serves the repo over http://localhost and opens
// index.html in Chromium with the external services stubbed (the sandbox cannot reach them).
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.md': 'text/markdown', '.css': 'text/css' };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://localhost:${server.address().port}/` }));
  });
}

// opts.storage: object of localStorage entries to seed before the page scripts run
async function openApp(opts = {}) {
  const { server, url } = await startServer();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

  // TAILWIND_CSS=<file>: inject a prebuilt stylesheet (see tests/build-css.sh) so layout is real
  let twCss = '';
  if (process.env.TAILWIND_CSS && fs.existsSync(path.resolve(process.env.TAILWIND_CSS))) twCss = fs.readFileSync(path.resolve(process.env.TAILWIND_CSS), 'utf8');
  const twBody = 'window.tailwind={config:{}};' + (twCss ? `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(twCss)};document.head.appendChild(s);})();` : '');
  await context.route(/cdn\.tailwindcss\.com/, (r) => r.fulfill({ contentType: 'text/javascript', body: twBody }));
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await context.route(/cdn\.jsdelivr\.net|static\.cloudflareinsights\.com|huggingface\.co/, (r) => r.abort());
  // opts.mediabunny: local copy of mediabunny.min.mjs, served in place of the jsDelivr import (fast render)
  if (opts.mediabunny) await context.route(/cdn\.jsdelivr\.net\/npm\/mediabunny/, (r) => r.fulfill({ contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(opts.mediabunny, 'utf8') }));
  await context.route(/api\.(groq|openai)\.com/, (r) => r.fulfill({ contentType: 'application/json', body: '{}' }));

  if (opts.storage) {
    await context.addInitScript((entries) => {
      if (sessionStorage.getItem('__seeded')) return; // seed once, so reloads keep what the app saved
      sessionStorage.setItem('__seeded', '1');
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
    }, opts.storage);
  }
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const close = async () => { await browser.close(); server.close(); };
  return { page, errors, close, url };
}

function makeChecker() {
  let failed = 0;
  return {
    ok(cond, msg) { if (cond) console.log('  ok   ' + msg); else { failed++; console.log('  FAIL ' + msg); } },
    eq(a, b, msg) { const same = JSON.stringify(a) === JSON.stringify(b); if (same) console.log('  ok   ' + msg); else { failed++; console.log('  FAIL ' + msg + '\n       got ' + JSON.stringify(a) + '\n       want ' + JSON.stringify(b)); } },
    done() { if (failed) { console.log(failed + ' check(s) failed'); process.exit(1); } console.log('all checks passed'); }
  };
}

// Local copy of mediabunny.min.mjs for the fast-render check (null when it cannot be installed)
function findMediabunny() {
  if (process.env.MEDIABUNNY_BUNDLE && fs.existsSync(process.env.MEDIABUNNY_BUNDLE)) return process.env.MEDIABUNNY_BUNDLE;
  const dir = path.join(os.tmpdir(), 'aura-mediabunny');
  const f = path.join(dir, 'node_modules/mediabunny/dist/bundles/mediabunny.min.mjs');
  if (fs.existsSync(f)) return f;
  try {
    fs.mkdirSync(dir, { recursive: true });
    execSync('npm i --no-audit --no-fund --prefix ' + JSON.stringify(dir) + ' mediabunny@1.63.0', { stdio: 'ignore' });
    if (fs.existsSync(f)) return f;
  } catch (e) {}
  return null;
}

module.exports = { openApp, makeChecker, findMediabunny };
