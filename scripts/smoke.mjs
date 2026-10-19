// Automated playtest harness: drives the real game in headless Chrome,
// kites like a human, picks sensible upgrade cards, samples state, writes report + screenshots.
// usage: node scripts/smoke.mjs [seconds]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const DURATION = Number(process.argv[2] || 90) * 1000;
const URL = process.env.URL || 'http://localhost:5173/';
const OUT = path.resolve('test-results');
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const errors = [];
const samples = [];

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`.slice(0, 300));
});

await page.goto(URL, { waitUntil: 'load' });
await page.waitForFunction(() => {
  const g = window.__game;
  return g && g.scene.isActive('Menu');
}, null, { timeout: 20000 });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'shots', '01-menu.png') });

await page.keyboard.press('Space');
await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 15000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, 'shots', '02-early.png') });

const readState = () => page.evaluate(() => {
  const g = window.__game;
  const gs = g.scene.getScene('Game');
  const up = g.scene.getScene('Upgrade');
  const upActive = g.scene.isActive('Upgrade');
  let flee = null;
  let loot = null;
  let nearestThreat = 1e9;
  if (gs && gs.enemies) {
    let fx = 0;
    let fy = 0;
    for (const e of gs.enemies.tracked) {
      if (!e.active) continue;
      const dx = gs.player.x - e.x;
      const dy = gs.player.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d < nearestThreat) nearestThreat = d;
      if (d < 300 && d > 0.01) {
        const w = (300 - d) / 300;
        fx += (dx / d) * w;
        fy += (dy / d) * w;
      }
    }
    if (fx || fy) flee = [fx, fy];
    // a real player sweeps back for loot when the coast is clear
    let best = null;
    let bestD = 420;
    for (const gem of gs.gems.getChildren()) {
      if (!gem.active) continue;
      const d = Math.hypot(gem.x - gs.player.x, gem.y - gs.player.y);
      if (d < bestD) { bestD = d; best = gem; }
    }
    for (const p of gs.pickups.getChildren()) {
      if (!p.active) continue;
      const d = Math.hypot(p.x - gs.player.x, p.y - gs.player.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best) loot = [best.x - gs.player.x, best.y - gs.player.y];
  }
  return {
    t: gs ? Math.round((gs.runSeconds || 0) * 10) / 10 : 0,
    hp: gs ? Math.round(gs.hp) : 0,
    maxHp: gs ? gs.maxHp : 0,
    lv: gs ? gs.level : 0,
    kills: gs ? gs.kills : 0,
    coins: gs ? gs.coins : 0,
    enemies: gs && gs.enemies ? gs.enemies.aliveCount : 0,
    shots: gs && gs.weapons ? gs.weapons.shots.countActive(true) : 0,
    pools: gs && gs.weapons ? gs.weapons.pools.length : 0,
    weapons: gs && gs.weapons ? gs.weapons.snapshot().map((w) => `${w.id}:${w.level}`) : [],
    passives: gs && gs.weapons ? gs.weapons.passiveSnapshot().map((p) => `${p.id}:${p.level}`) : [],
    fps: Math.round(g.loop.actualFps),
    upgrade: upActive,
    upgradeCards: upActive && up ? up.choices.map((c) => `${c.kind}:${c.id}:${c.level}:${c.rarity}`) : [],
    over: g.scene.isActive('GameOver'),
    pending: gs ? gs.pendingLevels : 0,
    hudTime: (() => { const h = g.scene.getScene('Hud'); return h && h.timeText ? h.timeText.text : null; })(),
    hudKills: (() => { const h = g.scene.getScene('Hud'); return h && h.killText ? h.killText.text : null; })(),
    audioSamples: gs && gs.audio ? [...gs.audio.usedSamples] : [],
    music: !!(gs && gs.music && gs.music.isPlaying),
    loot,
    nearestThreat: Math.round(nearestThreat),
    flee,
  };
});

const KEYMAP = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
};
let heldKeys = new Set();
async function steer(flee) {
  if (!flee) return;
  const [fx, fy] = flee;
  const want = new Set();
  if (fx > 0.25) want.add(KEYMAP.right);
  if (fx < -0.25) want.add(KEYMAP.left);
  if (fy > 0.25) want.add(KEYMAP.down);
  if (fy < -0.25) want.add(KEYMAP.up);
  if (!want.size) want.add(KEYMAP.right);
  for (const k of heldKeys) if (!want.has(k)) await page.keyboard.up(k);
  for (const k of want) if (!heldKeys.has(k)) await page.keyboard.down(k);
  heldKeys = want;
}

const t0 = Date.now();
let lastShot = 0;
let picks = 0;
let modalShotTaken = false;

while (Date.now() - t0 < DURATION) {
  const st = await readState();
  if (st.over) { samples.push(st); break; }

  if (st.upgrade) {
    if (!modalShotTaken) {
      modalShotTaken = true;
      await page.screenshot({ path: path.join(OUT, 'shots', '03-upgrade.png') });
    }
    // emulate a competent build: evolve > level the carry weapon > passives that unlock
  // evolutions > new weapons > anything else; take one curse contract early.
  const order = (c) => {
    if (c.includes('evolve')) return 0;
    if (c.startsWith('weapon-level')) return 1;
    if (c.startsWith('passive-level')) return 2;
    if (c.startsWith('curse')) return picks < 4 ? 2 : 6;
    if (c.startsWith('weapon-new')) return 3;
    if (c.startsWith('passive-new')) return 4;
    return 5;
  };
    const ranked = st.upgradeCards.map((c, i) => ({ c, i })).sort((a, b) => order(a.c) - order(b.c));
    await page.keyboard.press(String(ranked[0].i + 1));
    picks += 1;
    await page.waitForTimeout(150);
    continue;
  }

  if (Date.now() - lastShot > 15000) {
    lastShot = Date.now();
    await page.screenshot({ path: path.join(OUT, 'shots', `shot-${Math.round(st.t)}.png`) });
  }

  if (Math.random() < 0.05) await page.keyboard.press('Space');
  // head for loot when nothing is breathing down our neck, otherwise keep kiting
  const safeEnough = st.nearestThreat > 170;
  await steer(safeEnough && st.loot ? st.loot : st.flee);

  samples.push(st);
  await page.waitForTimeout(700);
}

for (const k of heldKeys) await page.keyboard.up(k);
const finalState = samples[samples.length - 1] || {};
if (finalState.over) await page.screenshot({ path: path.join(OUT, 'shots', '09-gameover.png') });

const uniq = (a) => [...new Set(a)];
const hpSeries = samples.map((s) => s.hp);
const report = {
  ranForMs: Date.now() - t0,
  samples: samples.length,
  upgradePicks: picks,
  final: finalState,
  furthest: samples.reduce((a, s) => (s.t > a.t ? s : a), {}),
  peakEnemies: Math.max(0, ...samples.map((s) => s.enemies)),
  minFps: Math.min(...samples.map((s) => s.fps).filter((n) => n > 0)),
  medianFps: samples.map((s) => s.fps).sort((a, b) => a - b)[Math.floor(samples.length / 2)],
  hpAtRisk: hpSeries.filter((h) => h < 30).length,
  weaponsSeen: uniq(samples.flatMap((s) => s.weapons)),
  passivesSeen: uniq(samples.flatMap((s) => s.passives)),
  hudTimeMatches: samples.filter((s) => s.hudTime && s.hudTime !== '00:00').length > 5,
  audioSamples: uniq(samples.flatMap((s) => s.audioSamples)),
  musicPlaying: samples.some((s) => s.music),
  errors: uniq(errors).slice(0, 40),
  errorCount: errors.length,
};

fs.writeFileSync(path.join(OUT, 'smoke.json'), JSON.stringify({ report, trace: samples }, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
