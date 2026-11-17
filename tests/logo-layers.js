// Plain node check for logo / image layers (UI, animation, transparency, persistence, export):
//   TAILWIND_CSS=tests/.tailwind.css node tests/logo-layers.js
// (build the CSS with `sh tests/build-css.sh`; without it the layout / pointer checks are skipped)
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { openApp, makeChecker, findMediabunny } = require('./serve-and-stub');

const SHOT_DIR = process.env.SHOT_DIR || os.tmpdir();
const CSS = path.resolve(process.env.TAILWIND_CSS || path.join(__dirname, '.tailwind.css'));
if (!process.env.TAILWIND_CSS) {
  try { if (!fs.existsSync(CSS)) execSync('sh ' + JSON.stringify(path.join(__dirname, 'build-css.sh')), { stdio: 'ignore' }); } catch (e) {}
}
if (fs.existsSync(CSS)) process.env.TAILWIND_CSS = CSS;
const HAS_CSS = !!process.env.TAILWIND_CSS;

const KEY = (n) => 'aura_logo_image_v1_' + n;
const rows = (page) => page.$$eval('#logoLayerList .logo-layer-row', (els) => els.map((el) => ({
  id: el.dataset.layerId, text: el.textContent.replace(/\s+/g, ' ').trim(), selected: el.getAttribute('aria-selected') === 'true',
  hidden: el.className.includes('opacity-60'), thumb: !!el.querySelector('img.logo-thumb')
})));
const logos = (page) => page.evaluate(() => JSON.parse(JSON.stringify(state.visualizer.logoLayers)));
const openVisualizerTab = (page) => page.click('#tabLeftVisuals');
const setCtl = (page, id, value, evt) => page.evaluate(([i, v, e]) => {
  const el = document.getElementById(i);
  if (el.type === 'checkbox') el.checked = v; else el.value = v;
  el.dispatchEvent(new Event(e, { bubbles: true }));
}, [id, value, evt]);
const storageKeys = (page) => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('aura_logo_image_v1_')).sort());

// A star on a transparent background, made in the page and returned as PNG bytes
async function starPng(page, color = '#ff3b6b') {
  const b64 = await page.evaluate((col) => {
    const c = document.createElement('canvas'); c.width = c.height = 200;
    const x = c.getContext('2d');
    x.fillStyle = col; x.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 40 : 95, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(100 + Math.cos(a) * r, 100 + Math.sin(a) * r); }
    x.closePath(); x.fill();
    return c.toDataURL('image/png').split(',')[1];
  }, color);
  return Buffer.from(b64, 'base64');
}
const upload = async (page, buf, name = 'star.png') => {
  await page.setInputFiles('#logoImageInput', { name, mimeType: 'image/png', buffer: buf });
  await page.waitForFunction(() => { const l = getSelectedLogoLayer(); return l && logoImages[l.id] && logoImages[l.id].naturalWidth > 0; }, null, { timeout: 10000 });
};
const loadDemo = async (page) => {
  await page.click('#btnLoadDemo');
  await page.waitForFunction(() => state.audio.isLoaded, null, { timeout: 30000 });
};

async function listUi(t) {
  console.log('(1) logo list + settings UI');
  const app = await openApp({ viewport: { width: 1280, height: 900 } });
  const { page } = app;
  await openVisualizerTab(page);
  const png = await starPng(page);

  t.eq((await rows(page)).length, 0, 'no logos at start');
  t.ok(await page.isDisabled('#btnLogoLayerDelete'), 'Delete disabled with no logo');
  t.ok(/Add a logo, artist photo or channel badge/.test(await page.textContent('#logoLayerEmpty')) && !(await page.$eval('#logoLayerEmpty', (e) => e.classList.contains('hidden'))), 'empty-state text shown');
  t.ok(await page.$eval('#logoLayerSettings', (e) => e.classList.contains('hidden')), 'settings hidden with none selected');
  t.eq((await page.textContent('#logoLayerCount')).trim(), '0/3', 'counter 0/3');

  await page.click('#btnLogoLayerAdd');
  t.eq((await rows(page)).length, 1, 'Add -> 1 row');
  t.ok(await page.$eval('#logoLayerEmpty', (e) => e.classList.contains('hidden')), 'empty text hidden');
  t.ok(!(await page.$eval('#logoLayerSettings', (e) => e.classList.contains('hidden'))), 'settings shown for the new logo');
  t.ok(/Logo settings\s*—\s*Logo 1/.test(await page.textContent('#logoLayerHeading')), 'heading "Logo settings — Logo 1"');
  t.ok((await rows(page))[0].text.includes('No image'), 'row says "No image"');
  t.eq((await page.textContent('#labelLogoImageUpload')).trim(), 'Upload image', 'label says Upload image');
  t.ok(await page.$eval('#btnLogoImageRemove', (e) => e.classList.contains('hidden')), 'Remove image hidden without an image');

  // real upload through the file input
  await upload(page, png);
  t.ok((await page.textContent('#toastContainer')).includes('Logo added!'), 'toast "Logo added!"');
  t.eq(await page.inputValue('#logoImageInput').catch(() => ''), '', 'file input reset');
  t.eq((await page.textContent('#labelLogoImageUpload')).trim(), 'Replace image', 'label says Replace image');
  t.ok(!(await page.$eval('#btnLogoImageRemove', (e) => e.classList.contains('hidden'))), 'Remove image shown');
  t.ok((await rows(page))[0].thumb, 'row shows a thumbnail');
  t.eq(await storageKeys(page), [KEY(1)], 'image saved under slot 1');

  await page.click('#btnLogoLayerAdd'); await page.click('#btnLogoLayerAdd');
  t.eq((await rows(page)).map((r) => (r.text.match(/^Logo \d/) || [''])[0]), ['Logo 3', 'Logo 2', 'Logo 1'], 'front-most (Logo 3) on top');
  t.eq((await logos(page)).map((l) => l.id), ['l1', 'l2', 'l3'], 'array order l1..l3');
  t.ok(await page.isDisabled('#btnLogoLayerAdd'), 'Add disabled at 3');
  t.eq((await page.textContent('#logoLayerCount')).trim(), '3/3', 'counter 3/3');
  t.eq(await page.evaluate(() => addLogoLayer()), null, 'addLogoLayer() returns null at 3');

  // delete the middle one: slot is reused by the next add
  await page.click('#logoLayerList .logo-layer-row >> nth=1');
  await page.click('#btnLogoLayerDelete');
  t.eq((await logos(page)).map((l) => l.id), ['l1', 'l3'], 'deleted l2');
  t.ok(await page.isEnabled('#btnLogoLayerAdd'), 'Add enabled again');
  await page.click('#btnLogoLayerAdd');
  t.eq((await logos(page)).map((l) => l.id), ['l1', 'l3', 'l2'], 'lowest free slot (l2) reused, added in front');

  // reorder: top row = l2 (front); move it down toward the back
  await page.click('#logoLayerList .logo-layer-row >> nth=0 >> [data-act="down"]');
  t.eq((await logos(page)).map((l) => l.id), ['l1', 'l2', 'l3'], 'down moves toward the back (array order)');
  let r = await rows(page);
  t.ok(r[1].id === 'l2' && r[1].text.startsWith('Logo 2') && r[1].selected, 'list follows: moved layer is now Logo 2 and selected');
  await page.click('#logoLayerList .logo-layer-row >> nth=1 >> [data-act="up"]');
  t.eq((await logos(page)).map((l) => l.id), ['l1', 'l3', 'l2'], 'up moves toward the front');
  t.ok(await page.isDisabled('#logoLayerList .logo-layer-row >> nth=0 >> [data-act="up"]'), 'top row Up disabled');
  t.ok(await page.isDisabled('#logoLayerList .logo-layer-row >> nth=2 >> [data-act="down"]'), 'bottom row Down disabled');
  t.ok((await rows(page)).filter((x) => x.thumb).length === 1 && (await rows(page))[2].thumb, 'only the l1 row (bottom) has a thumbnail');

  // eye toggle
  await page.click('#logoLayerList .logo-layer-row >> nth=0 >> [data-act="toggle"]');
  t.eq((await logos(page))[2].enabled, false, 'eye toggle hides the layer');
  t.ok((await rows(page))[0].hidden, 'hidden row is dimmed');
  await page.click('#logoLayerList .logo-layer-row >> nth=0 >> [data-act="toggle"]');
  t.eq((await logos(page))[2].enabled, true, 'eye toggle shows again');

  // selecting a row syncs every control
  await page.evaluate(() => {
    setLogoLayerProp('l1', 'shape', 'circle'); setLogoLayerProp('l1', 'outlineColor', '#00ff88'); setLogoLayerProp('l1', 'outlineWidth', 12);
    setLogoLayerProp('l1', 'opacity', 0.5); setLogoLayerProp('l1', 'rotation', -45); setLogoLayerProp('l1', 'animation', 'spinpulse');
    setLogoLayerProp('l1', 'spinSpeed', -20); setLogoLayerProp('l1', 'reactsTo', 'vocal'); setLogoLayerProp('l1', 'pulseAmount', 1.5); setLogoLayerProp('l1', 'punch', false);
  });
  const ctl = () => page.evaluate(() => ({
    heading: logoLayerHeading.textContent, shape: selectLogoShape.value, color: inputLogoOutlineColor.value, ow: sliderLogoOutline.value, owl: labelLogoOutline.textContent,
    op: sliderLogoOpacity.value, opl: labelLogoOpacity.textContent, rot: sliderLogoRotation.value, rotl: labelLogoRotation.textContent, anim: selectLogoAnimation.value,
    spin: sliderLogoSpin.value, spinl: labelLogoSpin.textContent, reacts: selectLogoReactsTo.value, pulse: sliderLogoPulse.value, pulsel: labelLogoPulse.textContent, punch: chkLogoPunch.checked,
    spinRow: !rowLogoSpin.classList.contains('hidden'), pulseRow: !rowLogoPulse.classList.contains('hidden')
  }));
  await page.click('#logoLayerList .logo-layer-row >> nth=2'); // l1
  let c = await ctl();
  t.eq(c, { heading: 'Logo settings — Logo 1', shape: 'circle', color: '#00ff88', ow: '12', owl: '12 px', op: '50', opl: '50%', rot: '-45', rotl: '-45°', anim: 'spinpulse', spin: '-20', spinl: '-20 rpm', reacts: 'vocal', pulse: '150', pulsel: '150%', punch: false, spinRow: true, pulseRow: true }, 'selecting Logo 1 fills every control');
  await page.click('#logoLayerList .logo-layer-row >> nth=0'); // l2, defaults
  c = await ctl();
  t.eq(c, { heading: 'Logo settings — Logo 3', shape: 'original', color: '#ffffff', ow: '0', owl: 'Off', op: '100', opl: '100%', rot: '0', rotl: '0°', anim: 'still', spin: '10', spinl: '10 rpm', reacts: 'kick', pulse: '100', pulsel: '100%', punch: true, spinRow: false, pulseRow: false }, 'selecting another logo shows its defaults (heading uses list position)');

  // each control writes the selected layer
  const id = await page.evaluate(() => state.visualizer.selectedLogoLayer);
  const prop = (k) => page.evaluate(([i, key]) => getLogoLayer(i)[key], [id, k]);
  await page.selectOption('#selectLogoShape', 'rounded'); t.eq(await prop('shape'), 'rounded', 'Shape writes layer');
  await setCtl(page, 'inputLogoOutlineColor', '#123456', 'input'); t.eq(await prop('outlineColor'), '#123456', 'Outline colour writes layer');
  await setCtl(page, 'sliderLogoOutline', 25, 'input'); t.eq(await prop('outlineWidth'), 25, 'Outline width writes layer');
  t.eq((await page.textContent('#labelLogoOutline')).trim(), '25 px', 'outline label "25 px"');
  await setCtl(page, 'sliderLogoOutline', 0, 'input'); t.eq((await page.textContent('#labelLogoOutline')).trim(), 'Off', 'outline label "Off" at 0');
  await setCtl(page, 'sliderLogoOpacity', 40, 'input'); t.eq(await prop('opacity'), 0.4, 'Opacity writes layer');
  await setCtl(page, 'sliderLogoRotation', 90, 'input'); t.eq(await prop('rotation'), 90, 'Rotation writes layer');
  await page.selectOption('#selectLogoAnimation', 'spin');
  t.eq(await prop('animation'), 'spin', 'Animation writes layer');
  c = await ctl(); t.ok(c.spinRow && !c.pulseRow, 'Spin: spin speed shown, pulse row hidden');
  await setCtl(page, 'sliderLogoSpin', 33, 'input'); t.eq(await prop('spinSpeed'), 33, 'Spin speed writes layer');
  await page.selectOption('#selectLogoAnimation', 'pulse');
  c = await ctl(); t.ok(!c.spinRow && c.pulseRow, 'Pulse: pulse row shown, spin speed hidden');
  await page.selectOption('#selectLogoReactsTo', 'melody'); t.eq(await prop('reactsTo'), 'melody', 'Reacts to writes layer');
  await setCtl(page, 'sliderLogoPulse', 60, 'input'); t.eq(await prop('pulseAmount'), 0.6, 'Pulse amount writes layer');
  await page.selectOption('#selectLogoAnimation', 'spinpulse');
  c = await ctl(); t.ok(c.spinRow && c.pulseRow, 'Spin + pulse: both rows shown');
  await page.selectOption('#selectLogoAnimation', 'still');
  c = await ctl(); t.ok(!c.spinRow && !c.pulseRow, 'Still: both rows hidden');
  await page.uncheck('#chkLogoPunch'); t.eq(await prop('punch'), false, 'Camera punch checkbox writes layer');
  t.eq(await page.evaluate(() => getLogoLayer('l1').shape), 'circle', 'other logo untouched');

  // keyboard select
  await page.focus('#logoLayerList .logo-layer-row >> nth=1');
  await page.keyboard.press('Enter');
  t.ok((await rows(page))[1].selected, 'Enter on a focused row selects it');
  await page.focus('#logoLayerList .logo-layer-row >> nth=2');
  await page.keyboard.press(' ');
  t.ok((await rows(page))[2].selected, 'Space on a focused row selects it');

  // slider ticks do not rebuild the list
  const same = await page.evaluate(() => {
    const row = document.querySelector('#logoLayerList .logo-layer-row');
    const s = document.getElementById('sliderLogoOpacity'); s.value = 33; s.dispatchEvent(new Event('input', { bubbles: true }));
    return row === document.querySelector('#logoLayerList .logo-layer-row');
  });
  t.ok(same, 'slider tick does not rebuild the list DOM');

  // Remove image
  await page.click('#logoLayerList .logo-layer-row >> nth=2');
  await page.click('#btnLogoImageRemove');
  t.eq(await page.evaluate(() => !!logoImages.l1), false, 'Remove image drops the image');
  t.ok((await rows(page))[2].text.includes('No image') && !(await rows(page))[2].thumb, 'row back to "No image"');
  t.eq(await storageKeys(page), [], 'saved copy removed');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function animation(t) {
  console.log('(2) transparent PNG spins and pulses on the kick');
  const app = await openApp({ viewport: { width: 1280, height: 900 } });
  const { page } = app;
  await openVisualizerTab(page);
  const png = await starPng(page);
  await loadDemo(page);
  await page.click('#btnLogoLayerAdd');
  await upload(page, png);
  await page.evaluate(() => {
    setLogoLayerProp('l1', 'animation', 'spinpulse'); setLogoLayerProp('l1', 'reactsTo', 'kick'); setLogoLayerProp('l1', 'pulseAmount', 1); setLogoLayerProp('l1', 'spinSpeed', 30);
    window.__log = [];
    const orig = window.drawLogoLayer;
    window.drawLogoLayer = function (ctx, layer, img, w, h, drive) {
      const r = orig.apply(this, arguments);
      const k = beatEngine.bands.kick;
      window.__log.push({ st: frameClock.songTime, angle: logoRuntime.get(layer.id).angle, scale: 1 + drive * layer.pulseAmount * 0.25, onset: k.onset });
      return r;
    };
    audioPlayer.play();
  });
  await page.waitForFunction(() => window.__log.length > 0 && window.__log[window.__log.length - 1].st > 6, null, { timeout: 30000 });
  const log = await page.evaluate(() => { audioPlayer.pause(); return window.__log; });
  const angles = log.map((l) => l.angle);
  t.ok(angles.every((a, i) => i === 0 || a >= angles[i - 1] - 1e-9), 'spin angle never goes backwards');
  const span = log[log.length - 1].st - log.find((l) => l.angle > 0).st;
  const expected = Math.PI * 2 * (30 / 60) * span;
  t.ok(angles[angles.length - 1] > 1 && Math.abs(angles[angles.length - 1] - expected) / expected < 0.35, `angle advanced ${angles[angles.length - 1].toFixed(2)} rad (~${expected.toFixed(2)} expected at 30 rpm)`);
  const scales = log.map((l) => l.scale);
  const lo = Math.min(...scales), hi = Math.max(...scales);
  t.ok(hi - lo > 0.05 && hi <= 1.26 && lo >= 0.999, `drawn scale pulses between ${lo.toFixed(3)} and ${hi.toFixed(3)}`);
  const onsetIdx = log.map((l, i) => (l.onset ? i : -1)).filter((i) => i >= 0);
  t.ok(onsetIdx.length >= 4, onsetIdx.length + ' kick onsets seen');
  const mean = scales.reduce((a, b) => a + b, 0) / scales.length;
  const peaks = onsetIdx.map((i) => Math.max(...scales.slice(i, i + 4)));
  const peakMean = peaks.reduce((a, b) => a + b, 0) / peaks.length;
  // Compare against the quieter frames (25th percentile), not the mean: the kick envelope's release keeps the
  // mean close to the peaks on a busy beat, and live headless frame timing varies between runs
  const p25 = [...scales].sort((a, b) => a - b)[Math.floor(scales.length * 0.25)];
  t.ok(peakMean >= mean && peakMean > p25 + 0.03, `scale peaks at kick onsets (mean peak ${peakMean.toFixed(3)} vs overall ${mean.toFixed(3)}, 25th pct ${p25.toFixed(3)})`);
  const quiet = log.filter((l, i) => !onsetIdx.some((o) => i >= o && i < o + 8)).map((l) => l.scale);
  t.ok(quiet.length > 0 && Math.min(...quiet) < peakMean - 0.03, 'scale falls back between kicks');

  // transparency: pixel inside the box but outside the star shows the scene behind
  const tr = await page.evaluate(() => {
    audioPlayer.pause();
    window.drawLogoLayer = window.drawLogoLayer; // keep the wrapper; it is harmless
    state.export.offlineRendering = true;
    const W = visualizerCanvas.width, H = visualizerCanvas.height;
    const bh = 0.4, bw = bh * H / W;
    setLogoLayerProp('l1', 'box', { x: 0.3, y: 0.3, w: bw, h: bh });
    for (const k of ['animation']) setLogoLayerProp('l1', k, 'still');
    setLogoLayerProp('l1', 'punch', false);
    const n = ANALYSER_FFT_SIZE / 2, freq = new Uint8Array(n).fill(40), time = new Uint8Array(n).fill(128);
    analysisInfo.sampleRate = 44100; analysisInfo.fftSize = ANALYSER_FFT_SIZE;
    const grab = (enabled) => {
      setLogoLayerProp('l1', 'enabled', enabled);
      resetAnimationState();
      drawScene({ t: 0, dt: 1 / 30, songTime: 0, playing: false, freq, time });
      return visualizerCanvas.getContext('2d').getImageData(0, 0, W, H);
    };
    const withLogo = grab(true), without = grab(false);
    const px = (img, x, y) => Array.from(img.data.slice((Math.round(y) * W + Math.round(x)) * 4, (Math.round(y) * W + Math.round(x)) * 4 + 4));
    const x0 = 0.3 * W, y0 = 0.3 * H, bwpx = bw * W, bhpx = bh * H;
    const corner = [x0 + 4, y0 + 4], centre = [x0 + bwpx / 2, y0 + bhpx * 0.28]; // inside the upper arm, clear of the lyrics line
    setLogoLayerProp('l1', 'enabled', true);
    state.export.offlineRendering = false;
    return { corner: [px(withLogo, ...corner), px(without, ...corner)], centre: [px(withLogo, ...centre), px(without, ...centre)] };
  });
  t.eq(tr.corner[0], tr.corner[1], 'pixel inside the logo box but outside the star is the scene behind (no opaque fill)');
  t.ok(tr.centre[0][0] > 200 && tr.centre[0][1] < 120 && tr.centre[0][3] === 255, 'star body is drawn in the star colour ' + JSON.stringify(tr.centre));

  // saved copy keeps the alpha channel
  const saved = await page.evaluate(() => new Promise((resolve) => {
    const src = localStorage.getItem('aura_logo_image_v1_1');
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      resolve({ type: src.slice(0, 22), corner: Array.from(x.getImageData(0, 0, 1, 1).data), centre: Array.from(x.getImageData(c.width >> 1, c.height >> 1, 1, 1).data) });
    };
    im.src = src;
  }));
  t.ok(/^data:image\/(webp|png)/.test(saved.type), 'saved as ' + saved.type);
  t.eq(saved.corner[3], 0, 'saved copy: corner pixel alpha 0');
  t.eq(saved.centre[3], 255, 'saved copy: star centre opaque');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function persistence(t) {
  console.log('(3) keeps its spot and shape after reload');
  const app = await openApp({ viewport: { width: 1280, height: 900 } });
  const { page } = app;
  await openVisualizerTab(page);
  const png = await starPng(page);
  await page.click('#btnLogoLayerAdd');
  await upload(page, png);
  await page.click('#btnLogoLayerAdd');
  await page.selectOption('#selectLogoShape', 'circle'); // Logo 2 is circle
  await page.evaluate(() => { setLogoLayerProp('l2', 'outlineWidth', 9); setLogoLayerProp('l2', 'rotation', 30); });
  await page.click('#logoLayerList .logo-layer-row >> nth=1'); // select Logo 1
  await page.evaluate(() => { setLogoLayerProp('l1', 'shape', 'circle'); setLogoLayerProp('l1', 'animation', 'spin'); setLogoLayerProp('l1', 'opacity', 0.8); });
  if (HAS_CSS) {
    const bb = await (await page.$('.layout-box[data-layer="logo:l1"]')).boundingBox();
    const rect = await (await page.$('#layoutEditor')).boundingBox();
    const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    const before = await page.evaluate(() => layerPixelRect('logo:l1', 1, 1));
    await page.keyboard.down('Alt');
    await page.mouse.move(cx, cy); await page.mouse.down();
    await page.mouse.move(cx + rect.width * 0.1, cy - rect.height * 0.05, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up('Alt');
    const moved = await page.evaluate(() => getLogoLayer('l1').box);
    t.ok(moved && Math.abs(moved.x - (before.x + 0.1)) < 0.02 && Math.abs(moved.y - (before.y - 0.05)) < 0.02, 'pointer drag moved the logo box (' + (moved && moved.x.toFixed(3)) + ',' + (moved && moved.y.toFixed(3)) + ')');
  } else {
    console.log('  skip pointer drag (no TAILWIND_CSS)');
    await page.evaluate(() => setLogoLayerProp('l1', 'box', { x: 0.1, y: 0.15, w: 0.2, h: 0.35 }));
  }
  const before = await logos(page);
  const rowsBefore = await rows(page);
  const png1 = await page.evaluate(() => localStorage.getItem('aura_logo_image_v1_1'));
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => logoImages.l1 && logoImages.l1.naturalWidth > 0, null, { timeout: 10000 });
  await page.waitForTimeout(300);
  t.eq(await logos(page), before, 'both logos (box, shape, animation, opacity...) restored');
  t.eq(await page.evaluate(() => state.visualizer.selectedLogoLayer), 'l1', 'selected logo restored');
  t.eq(await rows(page), rowsBefore, 'list rows restored identically (thumbnail on Logo 1, none on Logo 2)');
  t.ok((await page.evaluate(() => ({ s: selectLogoShape.value, a: selectLogoAnimation.value, o: sliderLogoOpacity.value }))).s === 'circle', 'controls reflect the restored logo');
  t.eq(await page.evaluate(() => localStorage.getItem('aura_logo_image_v1_1')) === png1, true, 'saved image untouched by the restore');
  t.eq(await page.evaluate(() => !!logoImages.l1 && !logoImages.l2), true, 'image restored for Logo 1 only');
  t.eq(await page.$$eval('.layout-box[data-layer^="logo:"]', (b) => b.length), 2, 'layout boxes for both logos rebuilt');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function exportMatch(t) {
  console.log('(4) preview vs fast render with logos');
  const mediabunny = findMediabunny();
  const app = await openApp({ mediabunny });
  const { page } = app;
  const png = await starPng(page);
  await loadDemo(page);
  await page.evaluate(async (b64) => {
    const bin = atob(b64); const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const file = new File([bytes], 'star.png', { type: 'image/png' });
    addLogoLayer(); addLogoLayer();
    await setLogoImageFromFile('l1', file); await setLogoImageFromFile('l2', file);
    // Logo 1: original shape, outline (cached silhouette), spin + pulse, punch OFF
    for (const [k, v] of Object.entries({ animation: 'spinpulse', outlineWidth: 14, outlineColor: '#00e5ff', spinSpeed: 25, reactsTo: 'kick', pulseAmount: 1.2, punch: false, rotation: 15, opacity: 0.9, box: { x: 0.05, y: 0.1, w: 0.2, h: 0.35 } })) setLogoLayerProp('l1', k, v);
    // Logo 2: circle, spin + pulse on the bass, punch ON
    for (const [k, v] of Object.entries({ animation: 'spinpulse', shape: 'circle', outlineWidth: 6, spinSpeed: -15, reactsTo: 'bass', pulseAmount: 0.8, punch: true, box: { x: 0.7, y: 0.4, w: 0.2, h: 0.35 } })) setLogoLayerProp('l2', k, v);
    state.visualizer.cameraPunch = 100;
    for (const [id, v] of [['exportFormat', 'webm'], ['exportResolution', '1280x720'], ['exportFps', '30'], ['exportRange', '15']]) {
      const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, png.toString('base64'));
  await page.waitForTimeout(500);
  t.eq((await page.textContent('#exportPathNote')).trim(), '⚡ Fast render', 'WebM uses Fast render here');

  const K = 40;
  await page.evaluate((K) => {
    window.__rec = { frames: [], hash: null };
    const orig = window.drawScene;
    const hashCanvas = () => {
      const d = visualizerCanvas.getContext('2d').getImageData(0, 0, visualizerCanvas.width, visualizerCanvas.height).data;
      let h = 2166136261; for (let i = 0; i < d.length; i += 5) { h ^= d[i]; h = Math.imul(h, 16777619); } return h >>> 0;
    };
    window.__hashCanvas = hashCanvas;
    window.drawScene = function (f) {
      const out = orig.call(this, f);
      if (state.export.offlineRendering && window.__rec.frames.length <= K) {
        window.__rec.frames.push({ t: f.t, dt: f.dt, songTime: f.songTime, freq: Array.from(f.freq), time: Array.from(f.time), punch: cameraFx.punch, angle: logoRuntime.get('l1') && logoRuntime.get('l1').angle });
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
    await page.evaluate(async (K) => {
      analysisInfo.sampleRate = 44100; analysisInfo.fftSize = ANALYSER_FFT_SIZE;
      const n = ANALYSER_FFT_SIZE / 2, freq = new Uint8Array(n), time = new Uint8Array(n);
      state.export.offlineRendering = true; resetAnimationState();
      for (let i = 0; i <= K; i++) { for (let k = 0; k < n; k++) { freq[k] = Math.round(140 * Math.max(0, Math.sin(k / 40 + i / 7))) + (i % 15 === 0 ? 80 : 0); time[k] = 128 + Math.round(50 * Math.sin(k / 5 + i)); } drawScene({ t: i / 30, dt: 1 / 30, songTime: i / 30, playing: true, freq, time }); }
      state.export.offlineRendering = false;
    }, K);
  }
  const rec = await page.evaluate(() => ({ n: window.__rec.frames.length, hash: window.__rec.hash, maxPunch: Math.max(...window.__rec.frames.map((f) => f.punch)), angle: window.__rec.frames.map((f) => f.angle) }));
  t.eq(rec.n, K + 1, 'recorded exporter frames 0..' + K);
  t.ok(rec.maxPunch > 0.2, 'camera punch is active in the recorded frames (max ' + rec.maxPunch.toFixed(2) + ')');
  t.ok(rec.angle[K] > rec.angle[5] && rec.angle[5] > 0, 'logo angle advances in the exporter');
  const replay = await page.evaluate((K) => {
    const frames = window.__rec.frames;
    state.export.offlineRendering = true;
    const run = (mut) => {
      resetAnimationState();
      if (mut) mut();
      for (let i = 0; i <= K; i++) { const f = frames[i]; drawScene({ t: f.t, dt: f.dt, songTime: f.songTime, playing: true, freq: Uint8Array.from(f.freq), time: Uint8Array.from(f.time) }); }
      return window.__hashCanvas();
    };
    const a = run(), b = run();
    // punch flag on a logo must change the picture while the camera punch is active
    getLogoLayer('l2').punch = false; const noPunch = run(); getLogoLayer('l2').punch = true;
    getLogoLayer('l1').enabled = false; getLogoLayer('l2').enabled = false; const none = run();
    getLogoLayer('l1').enabled = true; getLogoLayer('l2').enabled = true;
    state.export.offlineRendering = false;
    return { a, b, noPunch, none };
  }, K);
  t.eq(replay.a, replay.b, 'two replays of identical frame data give identical pixels (deterministic)');
  t.eq(replay.a, rec.hash, 'replay matches the pixels the exporter produced at frame ' + K + ' (hash ' + replay.a + ')');
  t.ok(replay.noPunch !== replay.a || replay.none !== replay.a, 'logos change the picture');
  t.ok(replay.none !== replay.a, 'the picture differs with the logos hidden');
  t.ok(replay.noPunch !== replay.a, 'the punch flag of a logo changes the picture while camera punch > 0');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function storageCleanup(t) {
  console.log('(5) deleting / resetting clears saved copies');
  const app = await openApp({ viewport: { width: 1280, height: 900 } });
  const { page } = app;
  await openVisualizerTab(page);
  const png = await starPng(page);
  for (let i = 0; i < 3; i++) { await page.click('#btnLogoLayerAdd'); await upload(page, png); }
  t.eq(await storageKeys(page), [KEY(1), KEY(2), KEY(3)], 'three images saved, one key per slot');
  // Remove image on Logo 3 (top row, selected)
  await page.click('#btnLogoImageRemove');
  t.eq(await storageKeys(page), [KEY(1), KEY(2)], 'Remove image deletes that slot key');
  // delete Logo 2 layer
  await page.click('#logoLayerList .logo-layer-row >> nth=1');
  await page.click('#btnLogoLayerDelete');
  t.eq(await storageKeys(page), [KEY(1)], 'deleting a layer deletes its key');
  await page.waitForTimeout(900);
  // Reset settings
  page.once('dialog', (d) => d.accept());
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('#btnResetSettings')]);
  await page.waitForTimeout(500);
  t.eq(await storageKeys(page), [], 'Reset settings clears all logo keys');
  t.eq(await page.evaluate(() => state.visualizer.logoLayers.length), 0, 'no logos after reset');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function storageFull(t) {
  console.log('(6) storage full');
  const app = await openApp({ viewport: { width: 1280, height: 900 } });
  const { page } = app;
  await openVisualizerTab(page);
  const png = await starPng(page);
  await page.evaluate(() => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (String(k).startsWith('aura_logo_image_v1_')) throw new DOMException('quota', 'QuotaExceededError');
      return orig.apply(this, arguments);
    };
  });
  await page.click('#btnLogoLayerAdd');
  await upload(page, png);
  await page.waitForSelector('text=Logo is too large to remember after reload, but it is in use now', { timeout: 3000 });
  t.ok(true, 'toast "Logo is too large to remember after reload, but it is in use now"');
  t.eq(await storageKeys(page), [], 'nothing was stored');
  const drawn = await page.evaluate(() => {
    state.export.offlineRendering = true;
    const W = visualizerCanvas.width, H = visualizerCanvas.height;
    const n = ANALYSER_FFT_SIZE / 2, freq = new Uint8Array(n).fill(30), time = new Uint8Array(n).fill(128);
    const grab = (en) => { setLogoLayerProp('l1', 'enabled', en); resetAnimationState(); drawScene({ t: 0, dt: 1 / 30, songTime: 0, playing: false, freq, time }); return visualizerCanvas.getContext('2d').getImageData(0, 0, W, H).data; };
    const a = grab(true), b = grab(false);
    setLogoLayerProp('l1', 'enabled', true); state.export.offlineRendering = false;
    let diff = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diff++;
    return diff;
  });
  t.ok(drawn > 500, 'the logo still draws (' + drawn + ' pixels differ from the scene without it)');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function layoutEditor(t) {
  console.log('(7) layout editor with logos');
  const app = await openApp({ viewport: { width: 1280, height: 900 } });
  const { page } = app;
  await openVisualizerTab(page);
  const png = await starPng(page);
  await page.click('#btnLogoLayerAdd'); await upload(page, png);
  await page.click('#btnLogoLayerAdd'); await upload(page, png);
  t.eq(await page.$$eval('.layer-pick', (b) => b.map((x) => x.textContent.trim())).then((a) => a.filter((x) => /^Logo/.test(x))), ['Logo 1', 'Logo 2'], 'pick buttons Logo 1, Logo 2');
  // picks <-> list
  await page.evaluate(() => [...document.querySelectorAll('.layer-pick')].find((b) => b.textContent.trim() === 'Logo 1').click());
  let r = await rows(page);
  t.ok(r[1].selected && r.filter((x) => x.selected).length === 1, 'layout pick "Logo 1" -> list highlights Logo 1');
  t.eq(await page.evaluate(() => state.visualizer.selectedLogoLayer), 'l1', 'selectedLogoLayer follows the pick');
  await page.click('#logoLayerList .logo-layer-row >> nth=0');
  t.eq(await page.evaluate(() => selectedLayer), 'logo:l2', 'list click selects the layer in the layout editor');
  t.ok(await page.evaluate(() => layoutBoxes['logo:l2'].classList.contains('selected')), 'editor box is marked selected');
  // selecting a viz layer then a logo again
  await page.click('.layer-pick >> nth=0');
  t.ok(String(await page.evaluate(() => selectedLayer)).startsWith('viz:'), 'picking a viz layer leaves the logo selection in place');
  await page.evaluate(() => [...document.querySelectorAll('.layer-pick')].find((b) => b.textContent.trim() === 'Logo 2').click());
  t.ok((await rows(page))[0].selected, 'pick Logo 2 -> top row highlighted');

  if (!HAS_CSS) { console.log('  skip pointer drag (no TAILWIND_CSS)'); }
  else {
    await page.evaluate(() => { setLogoLayerProp('l1', 'box', { x: 0.1, y: 0.15, w: 0.2 * 720 / 1280 * 1.0, h: 0.2 }); });
    await page.evaluate(() => [...document.querySelectorAll('.layer-pick')].find((b) => b.textContent.trim() === 'Logo 1').click());
    const rect = await (await page.$('#layoutEditor')).boundingBox();
    const drag = async (shift) => {
      const hb = await (await page.$('.layout-box[data-layer="logo:l1"] .lb-h[data-h="se"]')).boundingBox();
      await page.keyboard.down('Alt'); if (shift) await page.keyboard.down('Shift');
      await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await page.mouse.down();
      await page.mouse.move(hb.x + hb.width / 2 + rect.width * 0.08, hb.y + hb.height / 2 + 2, { steps: 4 });
      await page.mouse.up();
      if (shift) await page.keyboard.up('Shift'); await page.keyboard.up('Alt');
    };
    const b0 = await page.evaluate(() => getLogoLayer('l1').box);
    await drag(false);
    const b1 = await page.evaluate(() => getLogoLayer('l1').box);
    t.ok(b1.w > b0.w + 0.04 && Math.abs(b1.w / b1.h - b0.w / b0.h) < 1e-6, 'corner resize keeps the aspect by default');
    await drag(true);
    const b2 = await page.evaluate(() => getLogoLayer('l1').box);
    t.ok(b2.w > b1.w + 0.04 && Math.abs(b2.w / b2.h - b1.w / b1.h) > 0.05, 'Shift+corner unlocks the aspect');
    // clicking a box on the canvas selects it
    await page.evaluate(() => { setLogoLayerProp('l1', 'box', { x: 0.05, y: 0.05, w: 0.2, h: 0.2 }); setLogoLayerProp('l2', 'box', { x: 0.6, y: 0.5, w: 0.2, h: 0.2 }); });
    const tag = await (await page.$('.layout-box[data-layer="logo:l2"] .lb-tag')).boundingBox();
    await page.mouse.click(tag.x + tag.width / 2, tag.y + tag.height / 2);
    t.ok((await rows(page))[0].selected, 'clicking a logo box on the canvas selects it; list follows');
    // double click resets the box
    const bb = await (await page.$('.layout-box[data-layer="logo:l2"]')).boundingBox();
    await page.mouse.dblclick(bb.x + bb.width / 2, bb.y + bb.height / 2);
    t.eq(await page.evaluate(() => getLogoLayer('l2').box), null, 'double-click resets the logo box');
  }
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

async function layoutShots(t) {
  console.log('(8) layout at 390 and 1280 px');
  if (!HAS_CSS) { console.log('  skip (no TAILWIND_CSS)'); return; }
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const app = await openApp({ viewport: { width: w, height: h } });
    const { page } = app;
    const png = await starPng(page);
    await page.click('#tabLeftVisuals');
    await page.click('#btnLogoLayerAdd'); await upload(page, png);
    await page.click('#btnLogoLayerAdd');
    await page.evaluate(() => { setLogoLayerProp('l1', 'animation', 'spinpulse'); setLogoLayerProp('l1', 'outlineWidth', 10); selectLogoLayer('l1'); });
    await page.waitForTimeout(200);
    await page.evaluate(() => document.getElementById('logoLayersBlock').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(150);
    const m = await page.evaluate(() => {
      const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
      const block = document.getElementById('logoLayersBlock');
      const rowsR = [...document.querySelectorAll('#logoLayerList .logo-layer-row')].map((row) => ({ row: R(row), btns: [...row.querySelectorAll('button')].map(R) }));
      const top = ['btnLogoLayerAdd', 'btnLogoLayerDelete'].map((id) => R(document.getElementById(id)));
      const controls = [...document.querySelectorAll('#logoLayerSettings input, #logoLayerSettings select, #logoLayerSettings label, #logoLayerSettings button')].filter((e) => e.offsetParent !== null && !(e.type === 'file')).map(R);
      const inputs = [...document.querySelectorAll('#logoLayerSettings select, #logoLayerSettings button, #logoLayerSettings label[for="logoImageInput"], #logoLayerSettings input[type=color], #logoLayerSettings input[type=checkbox]')].filter((e) => e.offsetParent !== null).map((e) => ({ id: e.id || e.textContent.trim(), h: R(e.closest('label.flex') || e).h }));
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, rowsR, top, block: R(block), controls, inputs, setVisible: !document.getElementById('logoLayerSettings').classList.contains('hidden') };
    });
    t.ok(m.sw <= m.iw, `${w}px: no horizontal page overflow (scrollWidth ${m.sw} <= ${m.iw})`);
    t.eq(m.rowsR.length, 2, `${w}px: 2 rows rendered`);
    t.ok(m.rowsR.every((r, i) => r.row.h >= 32 && (i === 0 || r.row.t >= m.rowsR[i - 1].row.b - 0.5)), `${w}px: rows stacked, not overlapping, >= 32px tall`);
    t.ok(m.rowsR.every((r) => r.btns.every((b) => b.w >= 32 && b.h >= 32 && b.l >= r.row.l - 0.5 && b.r <= r.row.r + 0.5) && r.btns.every((b, i) => i === 0 || b.l >= r.btns[i - 1].r - 0.5)), `${w}px: row buttons >= 32px, inside the row, not overlapping`);
    t.ok(m.top.every((b, i) => b.h >= 32 && b.r <= m.iw && b.l >= 0 && (i === 0 || b.l >= m.top[i - 1].r - 0.5)), `${w}px: Add / Delete >= 32px, in view, not overlapping`);
    t.ok(m.setVisible, `${w}px: settings visible`);
    t.ok(m.controls.every((c) => c.l >= m.block.l - 0.5 && c.r <= m.block.r + 0.5), `${w}px: every setting control inside the Logos card`);
    t.ok(m.inputs.every((c) => c.h >= 31.5), `${w}px: touch targets >= 32px (` + m.inputs.map((c) => Math.round(c.h)).join(',') + ')');
    const file = path.join(SHOT_DIR, `logos-card-${w}.png`);
    await page.screenshot({ path: file });
    console.log('  screenshot ' + file);
    t.eq(app.errors, [], `${w}px: no console / page errors`);
    await app.close();
  }
}

async function everythingTogether(t) {
  console.log('(9) 6 viz layers + 3 logos playing together');
  const app = await openApp({ viewport: { width: 1280, height: 900 } });
  const { page } = app;
  const png = await starPng(page);
  await loadDemo(page);
  await page.evaluate(async (b64) => {
    const file = new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'star.png', { type: 'image/png' });
    for (let i = 0; i < 5; i++) addVizLayer();
    const modes = ['radial', 'mirrorbars', 'pulserings', 'aurora', 'inferno', 'dotspectrum'];
    state.visualizer.vizLayers.forEach((l, i) => { l.mode = modes[i]; });
    for (const [i, shape] of ['original', 'circle', 'rounded'].entries()) {
      const l = addLogoLayer(); await setLogoImageFromFile(l.id, file);
      setLogoLayerProp(l.id, 'shape', shape); setLogoLayerProp(l.id, 'animation', 'spinpulse'); setLogoLayerProp(l.id, 'outlineWidth', 8 + i * 4);
      setLogoLayerProp(l.id, 'reactsTo', ['kick', 'bass', 'vocal'][i]); setLogoLayerProp(l.id, 'punch', i !== 1);
    }
    state.visualizer.cameraPunch = 60;
    audioPlayer.play();
  }, png.toString('base64'));
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => ({ playing: !audioPlayer.paused, time: audioPlayer.currentTime, viz: state.visualizer.vizLayers.length, logos: state.visualizer.logoLayers.length }));
  t.ok(st.playing && st.time > 1 && st.viz === 6 && st.logos === 3, `playing ${st.time.toFixed(1)}s with ${st.viz} viz layers + ${st.logos} logos`);
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

(async () => {
  const t = makeChecker();
  console.log(HAS_CSS ? 'using real CSS: ' + CSS : 'no CSS: layout / pointer checks will be skipped');
  await listUi(t);
  await animation(t);
  await persistence(t);
  await exportMatch(t);
  await storageCleanup(t);
  await storageFull(t);
  await layoutEditor(t);
  await layoutShots(t);
  await everythingTogether(t);
  t.done();
})().catch((e) => { console.error(e); process.exit(1); });
