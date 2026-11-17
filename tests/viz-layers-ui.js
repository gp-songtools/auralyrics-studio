// Plain node check for the visualizer layer UI: `TAILWIND_CSS=tests/.tailwind.css node tests/viz-layers-ui.js`
// (build the CSS with `sh tests/build-css.sh`; without it the layout / pointer checks are skipped)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { openApp, makeChecker } = require('./serve-and-stub');

const SHOT_DIR = process.env.SHOT_DIR || os.tmpdir();
const CSS = path.resolve(process.env.TAILWIND_CSS || path.join(__dirname, '.tailwind.css'));
if (!process.env.TAILWIND_CSS) {
  try { if (!fs.existsSync(CSS)) execSync('sh ' + JSON.stringify(path.join(__dirname, 'build-css.sh')), { stdio: 'ignore' }); } catch (e) {}
}
if (fs.existsSync(CSS)) process.env.TAILWIND_CSS = CSS;
const HAS_CSS = !!process.env.TAILWIND_CSS;

const rows = (page) => page.$$eval('#vizLayerList .viz-layer-row', (els) => els.map((el) => ({
  id: el.dataset.layerId, text: el.textContent.replace(/\s+/g, ' ').trim(), selected: el.getAttribute('aria-selected') === 'true', hidden: el.className.includes('opacity-60')
})));
const layers = (page) => page.evaluate(() => JSON.parse(JSON.stringify(state.visualizer.vizLayers)));
const openVisualizerTab = async (page) => { await page.click('#tabLeftVisuals'); };

async function listUi(t) {
  console.log('(1) layer list UI');
  const app = await openApp({ viewport: { width: 1280, height: 900 } });
  const { page } = app;
  await openVisualizerTab(page);

  t.eq((await rows(page)).length, 1, 'one row at start');
  t.ok(await page.isDisabled('#btnVizLayerDelete'), 'Delete disabled with one layer');
  t.ok(await page.isEnabled('#btnVizLayerAdd'), 'Add enabled');
  for (let i = 0; i < 5; i++) await page.click('#btnVizLayerAdd');
  t.eq((await rows(page)).length, 6, 'Add x5 -> 6 rows');
  t.ok(await page.isDisabled('#btnVizLayerAdd'), 'Add disabled at 6');
  t.ok(await page.isDisabled('#btnVizLayerDuplicate'), 'Duplicate disabled at 6');
  t.eq((await page.textContent('#vizLayerCount')).trim(), '6/6', 'counter shows 6/6');
  let r = await rows(page);
  t.ok(r[0].text.startsWith('Viz 6') && r[5].text.startsWith('Viz 1'), 'top row = front-most (Viz 6 first)');
  t.ok(r[0].selected && r.filter((x) => x.selected).length === 1, 'newest layer is the selected row');
  t.eq(await page.$$eval('.layer-pick', (b) => b.map((x) => x.textContent)), ['Viz 1', 'Viz 2', 'Viz 3', 'Viz 4', 'Viz 5', 'Viz 6', 'Turntable', 'Lyrics'], 'layout pick labels match list names');

  while ((await rows(page)).length > 1) await page.click('#btnVizLayerDelete');
  t.ok(await page.isDisabled('#btnVizLayerDelete'), 'Delete disabled at 1 layer');
  t.eq((await rows(page)).length, 1, 'deleted down to 1');

  // duplicate copies settings
  await page.click('.viz-mode-btn[data-mode="inferno"]');
  await page.click('#btnVizLayerDuplicate');
  let L = await layers(page);
  t.eq(L.map((l) => l.mode), ['inferno', 'inferno'], 'Duplicate copies the pattern');
  t.eq((await rows(page))[0].selected, true, 'duplicate becomes selected (top row)');

  // distinct layers: v1 inferno/kick, v2 waveform/vocal
  await page.click('#vizLayerList .viz-layer-row >> nth=0');
  await page.click('.viz-mode-btn[data-mode="waveform"]');
  await page.selectOption('#selectVizReactsTo', 'vocal');
  await page.fill('#sliderVizRotation', '45');
  await page.selectOption('#selectVizLayerBlend', 'lighter');
  await page.check('#chkVizMirrorX');
  const [id2] = [L[1].id];
  await page.click('#vizLayerList .viz-layer-row >> nth=1'); // Viz 1
  await page.selectOption('#selectVizReactsTo', 'kick');
  await page.evaluate(() => { const s = document.getElementById('sliderGlow'); s.value = 33; s.dispatchEvent(new Event('input', { bubbles: true })); });
  L = await layers(page);
  t.ok(L[1].mode === 'waveform' && L[1].reactsTo === 'vocal' && L[1].rotation === 45 && L[1].blend === 'lighter' && L[1].mirrorX === true, 'controls wrote the (then selected) Viz 2');
  t.ok(L[0].mode === 'inferno' && L[0].reactsTo === 'kick' && L[0].glow === 33 && L[0].blend === 'source-over' && L[0].rotation === 0 && !L[0].mirrorX, 'and Viz 1 separately');

  // list click selects and syncs every control
  const ui = () => page.evaluate(() => ({
    mode: document.querySelector('.viz-mode-btn.border-2')?.dataset.mode, rx: selectVizReactsTo.value, glow: sliderGlow.value, glowLabel: labelGlow.textContent,
    rot: sliderVizRotation.value, rotLabel: labelVizRotation.textContent, blend: selectVizLayerBlend.value, mx: chkVizMirrorX.checked, my: chkVizMirrorY.checked, pal: selectVizLayerPalette.value,
    op: sliderVizOpacity.value, heading: vizLayerHeading.textContent, sel: state.visualizer.selectedVizLayer
  }));
  Object.assign(globalThis, {});
  await page.evaluate(() => { for (const id of ['sliderVizRotation', 'labelVizRotation', 'selectVizLayerBlend', 'chkVizMirrorX', 'chkVizMirrorY', 'selectVizLayerPalette', 'vizLayerHeading']) window[id] = window[id] || document.getElementById(id); });
  let u = await ui();
  t.ok(u.mode === 'inferno' && u.rx === 'kick' && u.glow === '33' && u.rot === '0' && u.blend === 'source-over' && !u.mx, 'Viz 1 selected: controls show Viz 1');
  t.ok(/Viz 1$/.test(u.heading), 'heading says Viz 1 (' + u.heading + ')');
  await page.click('#vizLayerList .viz-layer-row >> nth=0');
  u = await ui();
  t.ok(u.mode === 'waveform' && u.rx === 'vocal' && u.rot === '45' && u.rotLabel === '45°' && u.blend === 'lighter' && u.mx, 'row click -> Viz 2 controls (mode, reacts, rotation, blend, mirror)');
  t.ok(/Viz 2$/.test(u.heading), 'heading says Viz 2');

  // palette override: built-in and custom
  const palOpts = await page.$$eval('#selectVizLayerPalette option', (o) => o.map((x) => x.value));
  t.ok(palOpts[0] === '' && ['cyberpunk', 'synthwave', 'emerald', 'hyperviolet', 'sunset', 'monochrome'].every((k) => palOpts.includes(k)), 'palette select: follow-global + built-ins');
  await page.selectOption('#selectVizLayerPalette', 'synthwave');
  t.eq((await layers(page))[1].palette, 'synthwave', 'palette override written to the layer');
  t.eq(await page.evaluate(() => state.visualizer.theme), 'cyberpunk', 'global palette untouched');
  await page.selectOption('#selectVizLayerPalette', '');
  t.eq((await layers(page))[1].palette, null, 'Follow global palette -> null');
  // custom palette appears
  await page.evaluate(() => { customPalettes['Test Pal'] = { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff', bg0: '#000000', bg1: '#111111' }; rebuildCustomPaletteOptions(); });
  await page.waitForTimeout(50);
  const palOpts2 = await page.$$eval('#selectVizLayerPalette option', (o) => o.map((x) => x.value));
  t.ok(palOpts2.includes('my:Test Pal'), 'custom palette appears in layer palette list');
  await page.selectOption('#selectVizLayerPalette', 'my:Test Pal');
  t.eq((await layers(page))[1].palette, 'my:Test Pal', 'custom palette can be chosen');
  await page.evaluate(() => { delete customPalettes['Test Pal']; delete PALETTES['my:Test Pal']; rebuildCustomPaletteOptions(); });
  await page.waitForTimeout(50);
  t.eq(await page.inputValue('#selectVizLayerPalette'), '', 'deleted custom palette falls back to "Follow global" in the UI');

  // mirror Y, opacity
  await page.check('#chkVizMirrorY');
  t.eq((await layers(page))[1].mirrorY, true, 'Mirror Y writes layer');
  await page.uncheck('#chkVizMirrorX');
  t.eq((await layers(page))[1].mirrorX, false, 'Mirror X off');

  // hide/show toggle
  await page.click('#vizLayerList .viz-layer-row >> nth=0 >> [data-act="toggle"]');
  t.eq((await layers(page))[1].enabled, false, 'eye toggle hides layer');
  r = await rows(page);
  t.ok(r[0].hidden, 'hidden row is dimmed');
  await page.click('#vizLayerList .viz-layer-row >> nth=0 >> [data-act="toggle"]');
  t.eq((await layers(page))[1].enabled, true, 'eye toggle shows layer again');

  // reorder
  await page.click('#btnVizLayerAdd'); // Viz 3 on top
  const idsBefore = (await layers(page)).map((l) => l.id);
  await page.click('#vizLayerList .viz-layer-row >> nth=0 >> [data-act="down"]'); // move top toward the back
  t.eq((await layers(page)).map((l) => l.id), [idsBefore[0], idsBefore[2], idsBefore[1]], 'down moves toward the back (array order)');
  r = await rows(page);
  t.ok(r[1].text.startsWith('Viz 2') && r[1].selected, 'list follows: moved layer is now Viz 2, still selected');
  await page.click('#vizLayerList .viz-layer-row >> nth=1 >> [data-act="up"]');
  t.eq((await layers(page)).map((l) => l.id), idsBefore, 'up moves back toward the front');
  t.ok(await page.isDisabled('#vizLayerList .viz-layer-row >> nth=0 >> [data-act="up"]'), 'top row Up disabled');
  t.ok(await page.isDisabled('#vizLayerList .viz-layer-row >> nth=2 >> [data-act="down"]'), 'bottom row Down disabled');

  // layout editor <-> list
  await page.click('.layer-pick >> nth=0');
  r = await rows(page);
  t.ok(r[2].selected && r.filter((x) => x.selected).length === 1, 'layout pick button selects Viz 1; list highlight follows');
  u = await ui();
  t.eq(u.mode, 'inferno', 'and controls follow');
  await page.click('.layer-pick >> nth=2');
  t.ok((await rows(page))[0].selected, 'pick Viz 3 -> top row highlighted');
  await page.click('#vizLayerList .viz-layer-row >> nth=1');
  t.eq(await page.evaluate(() => selectedLayer), 'viz:' + idsBefore[1], 'list click selects the layer in the layout editor');
  t.eq(await page.evaluate((id) => layoutBoxes['viz:' + id].classList.contains('selected'), idsBefore[1]), true, 'editor box is marked selected');

  // keyboard: Enter on a row selects
  await page.focus('#vizLayerList .viz-layer-row >> nth=0');
  await page.keyboard.press('Enter');
  t.ok((await rows(page))[0].selected, 'Enter on a focused row selects it');

  // list is not rebuilt on slider ticks
  const same = await page.evaluate(() => {
    const row = document.querySelector('#vizLayerList .viz-layer-row');
    const s = document.getElementById('sliderGlow'); s.value = 11; s.dispatchEvent(new Event('input', { bubbles: true }));
    return row === document.querySelector('#vizLayerList .viz-layer-row');
  });
  t.ok(same, 'slider tick does not rebuild the list DOM');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function layoutEditor(t) {
  console.log('(2) layout editor with viz layers');
  const app = await openApp({ viewport: { width: 1280, height: 900 } });
  const { page } = app;
  await openVisualizerTab(page);
  await page.click('#btnVizLayerAdd');
  await page.evaluate(() => {
    setVizLayerProp('v1', 'box', { x: 0.1, y: 0.1, w: 0.3, h: 0.3 });
    setVizLayerProp('v2', 'box', { x: 0.6, y: 0.5, w: 0.3, h: 0.3 });
    state.visualizer.turntableEnabled = false;
    rebuildLayoutToolbar(); syncLayoutEditor();
  });
  t.eq(await page.$$eval('.layer-pick', (b) => b.length), 4, 'pick buttons: Viz 1, Viz 2, Turntable, Lyrics');
  const box = (id) => page.evaluate((i) => getVizLayer(i).box, id);
  const centre = async (sel) => { const b = await (await page.$(sel)).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
  if (!HAS_CSS) { console.log('  skip pointer drag (no TAILWIND_CSS; build with tests/build-css.sh)'); }
  else {
    await page.click('.layer-pick >> nth=0'); // select Viz 1
    const rect = await (await page.$('#layoutEditor')).boundingBox();
    // plain drag: move right 10% / down 10% with snap disabled (Alt)
    let c = await centre('.layout-box[data-layer="viz:v1"] .lb-tag').catch(() => null);
    const bb = await (await page.$('.layout-box[data-layer="viz:v1"]')).boundingBox();
    const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    await page.keyboard.down('Alt');
    await page.mouse.move(cx, cy); await page.mouse.down();
    await page.mouse.move(cx + rect.width * 0.05, cy + rect.height * 0.05, { steps: 3 });
    await page.mouse.move(cx + rect.width * 0.1, cy + rect.height * 0.1, { steps: 3 });
    await page.mouse.up();
    await page.keyboard.up('Alt');
    let b1 = await box('v1');
    t.ok(Math.abs(b1.x - 0.2) < 0.01 && Math.abs(b1.y - 0.2) < 0.01 && Math.abs(b1.w - 0.3) < 1e-6, 'pointer drag moves the viz box (' + b1.x.toFixed(3) + ',' + b1.y.toFixed(3) + ')');
    t.eq(await box('v2'), { x: 0.6, y: 0.5, w: 0.3, h: 0.3 }, 'other layer untouched');
    // snap: drag so the left edge ends ~0.005 from 0 -> snaps to 0
    await page.mouse.move(cx + rect.width * 0.1, cy + rect.height * 0.1);
    const bb2 = await (await page.$('.layout-box[data-layer="viz:v1"]')).boundingBox();
    const sx = bb2.x + bb2.width / 2, sy = bb2.y + bb2.height / 2;
    await page.mouse.move(sx, sy); await page.mouse.down();
    await page.mouse.move(sx - rect.width * 0.195, sy, { steps: 4 });
    await page.mouse.up();
    b1 = await box('v1');
    t.ok(b1.x === 0, 'snap to the frame edge without Alt (x=' + b1.x + ')');
    // shift + corner resize keeps ratio
    const before = await box('v1');
    const hb = await (await page.$('.layout-box[data-layer="viz:v1"] .lb-h[data-h="se"]')).boundingBox();
    await page.keyboard.down('Shift'); await page.keyboard.down('Alt');
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2 + rect.width * 0.1, hb.y + hb.height / 2 + 2, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up('Alt'); await page.keyboard.up('Shift');
    const after = await box('v1');
    t.ok(after.w > before.w + 0.05 && Math.abs(after.w / after.h - before.w / before.h) < 1e-6, 'Shift+corner resize keeps proportions');
    // double-click resets
    const bb3 = await (await page.$('.layout-box[data-layer="viz:v1"]')).boundingBox();
    await page.mouse.dblclick(bb3.x + bb3.width / 2, bb3.y + bb3.height / 2);
    t.eq(await box('v1'), null, 'double-click resets the viz box');
    // selecting another by clicking its box tag/body syncs the list
    await page.evaluate(() => { setVizLayerProp('v1', 'box', { x: 0.1, y: 0.1, w: 0.3, h: 0.3 }); }); // a full-frame selected box would cover the other tags
    const bb4 = await (await page.$('.layout-box[data-layer="viz:v2"] .lb-tag')).boundingBox();
    await page.mouse.click(bb4.x + bb4.width / 2, bb4.y + bb4.height / 2);
    const sel = await rows(page);
    t.ok(sel[0].selected && sel[0].text.startsWith('Viz 2'), 'clicking a box on the canvas selects it; list highlight follows');
  }
  // arrow nudge (selected = Viz 2)
  await page.click('.layer-pick >> nth=1');
  await page.evaluate(() => setVizLayerProp('v2', 'box', { x: 0.5, y: 0.5, w: 0.3, h: 0.3 }));
  await page.focus('body');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  const nb = await box('v2');
  t.ok(Math.abs(nb.x - 0.505) < 1e-9 && Math.abs(nb.y - 0.52) < 1e-9, 'arrow nudge 0.5% / Shift 2% (' + nb.x + ',' + nb.y + ')');
  // per-layer reset and reset all
  await page.click('#btnLayoutResetLayer');
  t.eq(await box('v2'), null, 'Reset layer clears the selected viz layer box');
  await page.evaluate(() => { setVizLayerProp('v1', 'box', { x: 0.2, y: 0.2, w: 0.2, h: 0.2 }); setVizLayerProp('v2', 'box', { x: 0.3, y: 0.3, w: 0.2, h: 0.2 }); state.visualizer.layers.lyrics = { x: 0.1, y: 0.7, w: 0.5, h: 0.2 }; });
  await page.click('#btnLayoutResetAll');
  t.eq(await page.evaluate(() => [getVizLayer('v1').box, getVizLayer('v2').box, state.visualizer.layers.lyrics]), [null, null, null], 'Reset all clears every box incl. lyrics');
  // duplicate offsets its box; new layer offsets
  await page.click('#btnVizLayerDuplicate');
  const dupBoxes = await page.evaluate(() => state.visualizer.vizLayers.map((l) => l.box));
  t.ok(dupBoxes[2] && dupBoxes[2].x === 0.03, 'duplicate gets an offset box so it is visible');
  t.eq(await page.$$eval('.layout-box', (b) => b.length), 5, 'layout boxes rebuilt for 3 viz + turntable + lyrics');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function roundTrip(t) {
  console.log('(3) settings round trip');
  const app = await openApp();
  const { page } = app;
  await page.evaluate(() => {
    addVizLayer();
    setVizLayerProp('v1', 'mode', 'mirrorbars'); setVizLayerProp('v1', 'reactsTo', 'melody'); setVizLayerProp('v1', 'reactivity', 2.1);
    setVizLayerProp('v1', 'glow', 31); setVizLayerProp('v1', 'opacity', 0.65); setVizLayerProp('v1', 'palette', 'sunset'); setVizLayerProp('v1', 'blend', 'lighter');
    setVizLayerProp('v1', 'mirrorY', true); setVizLayerProp('v1', 'rotation', -75); setVizLayerProp('v1', 'box', { x: 0.1, y: 0.2, w: 0.5, h: 0.4 });
    setVizLayerProp('v2', 'mode', 'pulserings'); setVizLayerProp('v2', 'reactsTo', 'kick'); setVizLayerProp('v2', 'enabled', false);
    setVizLayerProp('v2', 'blend', 'screen'); setVizLayerProp('v2', 'mirrorX', true); setVizLayerProp('v2', 'rotation', 120); setVizLayerProp('v2', 'palette', 'emerald');
    selectVizLayer('v1');
  });
  const before = await layers(page);
  const rowsBefore = await rows(page);
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);
  const after = await layers(page);
  t.eq(after, before, 'two non-default layers survive a reload');
  t.eq(await page.evaluate(() => state.visualizer.selectedVizLayer), 'v1', 'selected layer restored');
  t.eq(await rows(page), rowsBefore, 'list rows restored identically');
  const ctl = await page.evaluate(() => ({ mode: document.querySelector('.viz-mode-btn.border-2')?.dataset.mode, rot: sliderVizRotation.value, pal: selectVizLayerPalette.value, blend: selectVizLayerBlend.value, my: chkVizMirrorY.checked }));
  t.eq(ctl, { mode: 'mirrorbars', rot: '-75', pal: 'sunset', blend: 'lighter', my: true }, 'controls reflect restored selected layer');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function independentRings(t) {
  console.log('(4) two Pulse Rings, Kick vs Vocal');
  const app = await openApp();
  const { page } = app;
  await page.click('#btnLoadDemo');
  await page.waitForFunction(() => state.audio.isLoaded, null, { timeout: 30000 });
  await page.evaluate(() => {
    addVizLayer();
    for (const id of ['v1', 'v2']) setVizLayerProp(id, 'mode', 'pulserings');
    setVizLayerProp('v1', 'reactsTo', 'kick'); setVizLayerProp('v2', 'reactsTo', 'vocal');
    audioPlayer.play();
  });
  const snaps = [];
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(500);
    snaps.push(await page.evaluate(() => [JSON.stringify(getVizRuntime('v1').pulse), JSON.stringify(getVizRuntime('v2').pulse)]));
  }
  const differing = snaps.filter(([a, b]) => a !== b).length;
  t.ok(differing >= 4, 'runtime state differs between the layers in ' + differing + '/6 samples');
  t.ok(new Set(snaps.map((s) => s[0])).size > 2 && new Set(snaps.map((s) => s[1])).size > 2, 'both layers evolve over time');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

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

async function exportMatch(t) {
  console.log('(5) preview vs fast render');
  const mediabunny = findMediabunny();
  const app = await openApp({ mediabunny });
  const { page } = app;
  await page.click('#btnLoadDemo');
  await page.waitForFunction(() => state.audio.isLoaded, null, { timeout: 30000 });
  await page.evaluate(() => {
    addVizLayer();
    setVizLayerProp('v1', 'mode', 'mirrorbars'); setVizLayerProp('v1', 'reactsTo', 'melody');
    setVizLayerProp('v2', 'mode', 'radial'); setVizLayerProp('v2', 'reactsTo', 'kick'); setVizLayerProp('v2', 'blend', 'lighter');
    setVizLayerProp('v2', 'rotation', 20); setVizLayerProp('v1', 'mirrorX', true);
    for (const [id, v] of [['exportFormat', 'webm'], ['exportResolution', '1280x720'], ['exportFps', '30'], ['exportRange', '15']]) {
      const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await page.waitForTimeout(500);
  t.eq((await page.textContent('#exportPathNote')).trim(), '⚡ Fast render', 'WebM uses Fast render here');

  // Record every frame the exporter feeds to drawScene, plus the canvas content at frame K
  const K = 40;
  await page.evaluate((K) => {
    window.__rec = { frames: [], hash: null, drawCalls: 0 };
    const orig = window.drawScene;
    const hashCanvas = () => {
      const d = visualizerCanvas.getContext('2d').getImageData(0, 0, visualizerCanvas.width, visualizerCanvas.height).data;
      let h = 2166136261; for (let i = 0; i < d.length; i += 7) { h ^= d[i]; h = Math.imul(h, 16777619); } return h >>> 0;
    };
    window.__hashCanvas = hashCanvas;
    window.drawScene = function (f) {
      const out = orig.call(this, f);
      if (state.export.offlineRendering && window.__rec.frames.length <= K) {
        window.__rec.frames.push({ t: f.t, dt: f.dt, songTime: f.songTime, freq: Array.from(f.freq), time: Array.from(f.time) });
        if (window.__rec.frames.length === K + 1) window.__rec.hash = hashCanvas();
      }
      return out;
    };
  }, K);
  if (mediabunny) {
    await page.evaluate(() => { window.__exportDone = startExport().then(() => 'done').catch((e) => 'error ' + e.message); });
    await page.waitForFunction(() => !!state.export.videoBlob, null, { timeout: 180000 });
    const res = await page.evaluate(() => ({ size: state.export.videoBlob.size, type: state.export.videoBlob.type, last: state.export.lastRender, done: window.__exportDone }));
    t.ok(res.size > 10000 && /webm/.test(res.type), 'fast render finished: ' + res.type + ', ' + res.size + ' bytes, ' + res.last.frames + ' frames in ' + res.last.seconds.toFixed(1) + 's');
    t.eq(await page.evaluate(() => state.export.offlineRendering), false, 'exporter released the canvas');
  } else {
    console.log('  skip real export (mediabunny not available: npm install failed; set MEDIABUNNY_BUNDLE)');
    // still record frames through the same call path as the exporter
    await page.evaluate(async (K) => {
      const fftSize = ANALYSER_FFT_SIZE; analysisInfo.sampleRate = 44100; analysisInfo.fftSize = fftSize;
      const n = fftSize / 2, freq = new Uint8Array(n), time = new Uint8Array(n);
      state.export.offlineRendering = true; resetAnimationState();
      for (let i = 0; i <= K; i++) { for (let k = 0; k < n; k++) { freq[k] = Math.round(140 * Math.max(0, Math.sin(k / 40 + i / 7))) + (i % 15 === 0 ? 80 : 0); time[k] = 128 + Math.round(50 * Math.sin(k / 5 + i)); } drawScene({ t: i / 30, dt: 1 / 30, songTime: i / 30, playing: true, freq, time }); }
      state.export.offlineRendering = false;
    }, K);
  }
  const rec = await page.evaluate(() => ({ n: window.__rec.frames.length, hash: window.__rec.hash }));
  t.eq(rec.n, K + 1, 'recorded exporter frames 0..' + K);
  // Replay: the live preview path = resetAnimationState + drawScene with the identical frame data; pixels must match
  const replay = await page.evaluate((K) => {
    const frames = window.__rec.frames;
    state.export.offlineRendering = true; // keep the rAF loop out
    const run = () => {
      resetAnimationState();
      for (let i = 0; i <= K; i++) {
        const f = frames[i];
        drawScene({ t: f.t, dt: f.dt, songTime: f.songTime, playing: true, freq: Uint8Array.from(f.freq), time: Uint8Array.from(f.time) });
      }
      return window.__hashCanvas();
    };
    const a = run(), b = run();
    state.export.offlineRendering = false;
    return { a, b };
  }, K);
  t.eq(replay.a, replay.b, 'two replays of identical frame data give identical pixels (deterministic)');
  t.eq(replay.a, rec.hash, 'replay matches the pixels the exporter produced at frame ' + K + ' (hash ' + replay.a + ')');
  // And the layers actually render something different from each other
  const distinct = await page.evaluate(() => {
    const frames = window.__rec.frames; state.export.offlineRendering = true;
    const h = [];
    for (const lay of [[true, false], [false, true]]) {
      resetAnimationState();
      state.visualizer.vizLayers[0].enabled = lay[0]; state.visualizer.vizLayers[1].enabled = lay[1];
      for (let i = 0; i <= 40; i++) { const f = frames[i]; drawScene({ t: f.t, dt: f.dt, songTime: f.songTime, playing: true, freq: Uint8Array.from(f.freq), time: Uint8Array.from(f.time) }); }
      h.push(window.__hashCanvas());
    }
    state.visualizer.vizLayers.forEach((l) => { l.enabled = true; });
    state.export.offlineRendering = false;
    return h;
  });
  t.ok(distinct[0] !== distinct[1], 'each layer alone draws a different picture');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function layoutShots(t) {
  console.log('(6) layout at 390 and 1280 px');
  if (!HAS_CSS) { console.log('  skip (no TAILWIND_CSS)'); return; }
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const app = await openApp({ viewport: { width: w, height: h } });
    const { page } = app;
    await page.click('#tabLeftVisuals');
    await page.click('#btnVizLayerAdd'); await page.click('#btnVizLayerAdd');
    await page.evaluate(() => { setVizLayerProp('v1', 'mode', 'mirrorbars'); setVizLayerProp('v2', 'mode', 'pulserings'); setVizLayerProp('v3', 'mode', 'dotspectrum'); setVizLayerProp('v2', 'enabled', false); selectVizLayer('v2'); });
    await page.click('#tabLeftVisuals');
    await page.waitForTimeout(200);
    await page.evaluate(() => { const c = document.getElementById('setupColumn'); if (c) c.scrollTop = 0; document.getElementById('vizLayersBlock').scrollIntoView({ block: 'start' }); window.scrollBy(0, -100); });
    await page.waitForTimeout(100);
    const m = await page.evaluate(() => {
      const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
      const rowsR = [...document.querySelectorAll('#vizLayerList .viz-layer-row')].map((row) => ({ row: R(row), btns: [...row.querySelectorAll('button')].map(R) }));
      const top = ['btnVizLayerAdd', 'btnVizLayerDuplicate', 'btnVizLayerDelete'].map((id) => R(document.getElementById(id)));
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, rowsR, top, block: R(document.getElementById('vizLayersBlock')) };
    });
    t.ok(m.sw <= m.iw, `${w}px: no horizontal page overflow (scrollWidth ${m.sw} <= ${m.iw})`);
    t.eq(m.rowsR.length, 3, `${w}px: 3 rows rendered`);
    t.ok(m.rowsR.every((r, i) => r.row.h >= 32 && (i === 0 || r.row.t >= m.rowsR[i - 1].row.b - 0.5)), `${w}px: rows stacked, not overlapping, >= 32px tall`);
    t.ok(m.rowsR.every((r) => r.btns.every((b) => b.w >= 32 && b.h >= 32 && b.l >= r.row.l - 0.5 && b.r <= r.row.r + 0.5) && r.btns.every((b, i) => i === 0 || b.l >= r.btns[i - 1].r - 0.5)), `${w}px: row buttons >= 32px, inside the row, not overlapping`);
    t.ok(m.top.every((b, i) => b.h >= 32 && b.r <= m.iw && b.l >= 0 && (i === 0 || b.l >= m.top[i - 1].r - 0.5)), `${w}px: Add / Duplicate / Delete >= 32px, in view, not overlapping`);
    t.ok(m.rowsR.every((r) => r.row.r <= m.block.r + 0.5 && r.row.l >= m.block.l - 0.5), `${w}px: rows inside the Layers block`);
    const file = path.join(SHOT_DIR, `visualizer-tab-${w}.png`);
    await page.screenshot({ path: file });
    console.log('  screenshot ' + file);
    t.eq(app.errors, [], `${w}px: no console / page errors`);
    await app.close();
  }
}

async function perf(t) {
  console.log('(7) perf: 6 layers, 1920x1080 (informational)');
  const app = await openApp();
  const { page } = app;
  const r = await page.evaluate(() => {
    for (let i = 0; i < 5; i++) addVizLayer();
    const modes = ['radial', 'mirrorbars', 'pulserings', 'aurora', 'inferno', 'dotspectrum'];
    const blends = ['source-over', 'lighter', 'screen', 'source-over', 'lighter', 'source-over'];
    state.visualizer.vizLayers.forEach((l, i) => { l.mode = modes[i]; l.glow = 35; l.blend = blends[i]; l.opacity = i % 2 ? 0.7 : 1; l.rotation = i * 15; l.mirrorX = i === 1; l.reactsTo = ['classic', 'kick', 'bass', 'melody', 'vocal', 'kick'][i]; });
    const sel = document.getElementById('exportResolution'); sel.value = '1920x1080'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    state.export.offlineRendering = true;
    const fftSize = ANALYSER_FFT_SIZE; analysisInfo.sampleRate = 44100; analysisInfo.fftSize = fftSize;
    const n = fftSize / 2, freq = new Uint8Array(n), time = new Uint8Array(n);
    resetAnimationState();
    const frame = (i) => { for (let k = 0; k < n; k++) { freq[k] = Math.round(150 * Math.max(0, Math.sin(k / 30 + i / 5))) + (i % 15 === 0 ? 90 : 0); time[k] = 128 + Math.round(60 * Math.sin(k / 4 + i)); } drawScene({ t: i / 60, dt: 1 / 60, songTime: i / 60, playing: true, freq, time }); };
    for (let i = 0; i < 10; i++) frame(i);
    const t0 = performance.now();
    for (let i = 10; i < 130; i++) frame(i);
    const ms = (performance.now() - t0) / 120;
    state.export.offlineRendering = false;
    return { ms, w: visualizerCanvas.width, h: visualizerCanvas.height };
  });
  console.log(`  PERF ${r.ms.toFixed(1)} ms/frame at ${r.w}x${r.h}, 6 layers, glow 35 (headless, software canvas)`);
  t.ok(r.w === 1920 && r.h === 1080, 'canvas is 1920x1080');
  t.ok(Number.isFinite(r.ms), 'perf measured');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

(async () => {
  const t = makeChecker();
  console.log(HAS_CSS ? 'using real CSS: ' + CSS : 'no CSS: layout / pointer checks will be skipped');
  await listUi(t);
  await layoutEditor(t);
  await roundTrip(t);
  await independentRings(t);
  await exportMatch(t);
  await layoutShots(t);
  await perf(t);
  t.done();
})().catch((e) => { console.error(e); process.exit(1); });
