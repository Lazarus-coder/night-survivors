// Systems smoke test: grant every weapon + passive, force the level-up modal,
// then verify nothing throws and all subsystems are actually running.
// usage: node scripts/systems-test.mjs [seconds]
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const SECONDS = Number(process.argv[2] || 45);
const OUT = path.resolve('test-results');
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const errors = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`.slice(0, 240)); });

await page.goto('http://localhost:5173/');
await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Menu'), null, { timeout: 20000 });
await page.keyboard.press('Space');
await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 15000 });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  g.debugGrantAll();
  g.debugOpenModal();
});
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'shots', '10-modal-full.png') });
const modal = await page.evaluate(() => {
  const up = window.__game.scene.getScene('Upgrade');
  return { active: window.__game.scene.isActive('Upgrade'), cards: up ? up.choices.map((c) => `${c.kind}:${c.id}:${c.level}:${c.rarity}`) : null };
});
await page.keyboard.press('1');
await page.waitForTimeout(400);

// let every weapon fire for a while, kiting gently
await page.keyboard.down('KeyD');
await page.waitForTimeout(SECONDS * 1000 / 2);
await page.keyboard.up('KeyD');
await page.keyboard.down('KeyW');
await page.waitForTimeout(SECONDS * 1000 / 2);
await page.keyboard.up('KeyW');

const state = await page.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  const w = g.weapons;
  return {
    t: Math.round(g.runSeconds),
    hp: Math.round(g.hp),
    level: g.level,
    kills: g.kills,
    enemies: g.enemies.aliveCount,
    activeShots: w.shots.countActive(true),
    pools: w.pools.length,
    auraVisible: !!(w.aura && w.aura.visible),
    weapons: w.snapshot().map((x) => `${x.id}:${x.level}${x.evolved ? '(evo)' : ''}`),
    passives: w.passiveSnapshot().map((x) => `${x.id}:${x.level}`),
    gemsOnField: g.gems.countActive(true),
    pickupsOnField: g.pickups.countActive(true),
    fps: Math.round(window.__game.loop.actualFps),
    modalOpen: g.modalOpen,
    pending: g.pendingLevels,
  };
});
await page.screenshot({ path: path.join(OUT, 'shots', '11-all-weapons.png') });

const result = { modal, state, errors: [...new Set(errors)], errorCount: errors.length };
fs.writeFileSync(path.join(OUT, 'systems.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close();
