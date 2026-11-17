// Plain node check for the visualizer layer stack: `node tests/viz-layers-core.js`
const { openApp, makeChecker } = require('./serve-and-stub');

const MODES = ['radial', 'equalizer', 'waveform', 'nebula', 'aurora', 'dualring', 'pulserings', 'mirrorbars', 'inferno', 'spiralburst', 'vumeter', 'ledmeter', 'dotspectrum'];

async function migration(t) {
  console.log('(a) v1 settings migration');
  const v1 = {
    v: 1,
    controls: { sliderReactivity: '1.8', sliderGlow: '30', sliderVizOpacity: '60', selectVizReactsTo: 'melody', sliderSmoothing: '0.9' },
    mode: 'mirrorbars',
    layers: { visualizer: { x: 0.1, y: 0.2, w: 0.5, h: 0.6 }, turntable: { x: 0.6, y: 0.1, w: 0.2, h: 0.3 }, lyrics: null }
  };
  const app = await openApp({ storage: { aura_settings_v1: JSON.stringify(v1) } });
  const r = await app.page.evaluate(() => ({
    layers: state.visualizer.vizLayers, sel: state.visualizer.selectedVizLayer, tt: state.visualizer.layers,
    active: document.querySelector('.viz-mode-btn.border-2')?.dataset.mode,
    opLabel: document.getElementById('labelVizOpacity').textContent, rx: document.getElementById('selectVizReactsTo').value,
    smoothing: state.visualizer.smoothing
  }));
  t.eq(r.layers.length, 1, 'one layer');
  const l = r.layers[0];
  t.ok(l.mode === 'mirrorbars' && l.opacity === 0.6 && l.reactsTo === 'melody' && l.reactivity === 1.8 && l.glow === 30, 'values migrated');
  t.eq(l.box, { x: 0.1, y: 0.2, w: 0.5, h: 0.6 }, 'box migrated');
  t.eq(r.tt.turntable, { x: 0.6, y: 0.1, w: 0.2, h: 0.3 }, 'turntable box kept');
  t.eq([r.active, r.opLabel, r.rx], ['mirrorbars', '60%', 'melody'], 'controls follow layer');
  t.eq(r.smoothing, 0.9, 'global smoothing still restored');
  await app.page.evaluate(() => setVizLayerProp('v1', 'glow', 30));
  await app.page.waitForTimeout(500);
  const saved = await app.page.evaluate(() => JSON.parse(localStorage.getItem('aura_settings_v1')));
  t.ok(saved.v === 2 && saved.vizLayers.length === 1 && !('sliderReactivity' in saved.controls), 'resaved as v2');
  t.eq(app.errors, [], 'no errors');
  await app.close();
}

async function limits(t) {
  console.log('(b) add / delete limits');
  const app = await openApp();
  const r = await app.page.evaluate(() => {
    for (let i = 0; i < 5; i++) addVizLayer();
    const six = state.visualizer.vizLayers.length;
    addVizLayer();
    const stillSix = state.visualizer.vizLayers.length;
    const ids = state.visualizer.vizLayers.map(l => l.id);
    const dup = duplicateVizLayer('v1');
    const boxes = document.querySelectorAll('.layout-box').length, picks = document.querySelectorAll('.layer-pick').length;
    const sel = selectedLayer;
    for (let i = 0; i < 10; i++) deleteVizLayer(state.visualizer.vizLayers[0].id);
    const one = state.visualizer.vizLayers.length;
    const addAfter = addVizLayer();
    return { six, stillSix, ids, dup, boxes, picks, sel, one, newId: addAfter.id, rtKeys: [...vizRuntime.keys()] };
  });
  t.eq([r.six, r.stillSix], [6, 6], '6th add allowed, 7th is a no-op');
  t.eq(r.dup, null, 'duplicate at max is a no-op');
  t.eq([r.boxes, r.picks], [8, 8], '6 viz + turntable + lyrics boxes and pick buttons');
  t.eq(r.sel, 'viz:v6', 'new layer selected in editor');
  t.eq(r.one, 1, 'delete stops at one layer');
  t.ok(!r.ids.includes(r.newId), 'ids not reused (' + r.newId + ')');
  await app.page.evaluate(() => { const l = getSelectedVizLayer(); moveVizLayer(l.id, -1); duplicateVizLayer(l.id); });
  const order = await app.page.evaluate(() => state.visualizer.vizLayers.map(l => l.id));
  t.eq(order.length, 3, 'duplicate inserts a layer');
  // clicking a layout pick selects the layer and controls follow
  await app.page.evaluate(() => { setVizLayerProp(state.visualizer.vizLayers[0].id, 'mode', 'inferno'); });
  await app.page.click('.layer-pick >> nth=0');
  const act = await app.page.evaluate(() => document.querySelector('.viz-mode-btn.border-2')?.dataset.mode);
  t.eq(act, 'inferno', 'picking a layer syncs mode buttons');
  t.eq(app.errors, [], 'no errors');
  await app.close();
}

async function playAll(t) {
  console.log('(c)/(d) all modes while playing, per-layer runtime');
  const app = await openApp();
  await app.page.click('#btnLoadDemo');
  await app.page.waitForFunction(() => state.audio.isLoaded, null, { timeout: 30000 });
  await app.page.evaluate(() => { audioPlayer.play(); });
  await app.page.waitForTimeout(500);
  const playing = await app.page.evaluate(() => state.audio.isPlaying || !audioPlayer.paused);
  t.ok(playing, 'demo playing');
  await app.page.evaluate(() => {
    for (let i = 0; i < 5; i++) addVizLayer();
    state.visualizer.vizLayers.forEach((l, i) => { l.mode = 'pulserings'; });
    setVizLayerProp('v1', 'reactsTo', 'kick'); setVizLayerProp('v2', 'reactsTo', 'vocal');
    setVizLayerProp('v3', 'opacity', 0.5); setVizLayerProp('v4', 'blend', 'lighter');
    setVizLayerProp('v5', 'rotation', 30); setVizLayerProp('v6', 'mirrorX', true);
  });
  await app.page.waitForTimeout(4000);
  const rt = await app.page.evaluate(() => ({ a: JSON.stringify(getVizRuntime('v1').pulse), b: JSON.stringify(getVizRuntime('v2').pulse) }));
  t.ok(rt.a !== rt.b, 'kick vs vocal pulserings have different runtime state');
  for (const mode of MODES) {
    await app.page.evaluate((m) => { state.visualizer.vizLayers.forEach((l, i) => { l.mode = MODES_ROT(m, i); }); function MODES_ROT(m, i) { const all = ['radial','equalizer','waveform','nebula','aurora','dualring','pulserings','mirrorbars','inferno','spiralburst','vumeter','ledmeter','dotspectrum']; return all[(all.indexOf(m) + i) % all.length]; } }, mode);
    await app.page.waitForTimeout(250);
  }
  const vu = await app.page.evaluate(() => { audioPlayer.currentTime = 1; audioPlayer.play(); state.visualizer.vizLayers[0].mode = 'vumeter'; state.visualizer.vizLayers[0].reactsTo = 'classic'; return null; });
  await app.page.waitForTimeout(800);
  const lvl = await app.page.evaluate(() => getVizRuntime('v1').vu.level);
  t.ok(lvl > -20, 'VU needle moves while playing (' + lvl.toFixed(1) + ')');
  // direct drawScene call, as the exporter does, with isPlaying false
  const exp = await app.page.evaluate(() => {
    resetAnimationState();
    state.audio.isPlaying = false;
    const n = dataFrequencyArray.length, f = new Uint8Array(n).fill(120), td = new Uint8Array(n);
    for (let i = 0; i < n; i++) td[i] = 128 + Math.round(60 * Math.sin(i / 3));
    for (let k = 0; k < 20; k++) drawScene({ t: k / 30, dt: 1 / 30, songTime: k / 30, playing: true, freq: f, time: td });
    return getVizRuntime('v1').vu.level;
  });
  t.ok(exp > -20, 'VU reacts in exporter-style frames (' + exp.toFixed(1) + ')');
  t.eq(app.errors, [], 'no console / page errors');
  await app.close();
}

(async () => {
  const t = makeChecker();
  await migration(t);
  await limits(t);
  await playAll(t);
  t.done();
})().catch((e) => { console.error(e); process.exit(1); });
