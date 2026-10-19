// Endgame + UI verification: pauses for the build panel, then jumps the clock to the
// Death phase to check boss music, the boss itself, and how the run actually ends.
// usage: node scripts/endgame-test.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

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

// give the player a build so the pause panel has something to show
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  g.weapons.add('orbit');
  g.weapons.add('chain');
  g.weapons.levelUp('knife');
  g.weapons.levelUp('knife');
  g.weapons.addPassive('might');
  g.weapons.addPassive('area');
  g.curse = 1;
  g.gainXp(40);
});
await page.waitForTimeout(600);
// drain every level-up modal that popped from the xp grant, otherwise the run stays paused
for (let i = 0; i < 12; i++) {
  const modal = await page.evaluate(() => window.__game.scene.isActive('Upgrade'));
  if (!modal) break;
  await page.keyboard.press('1');
  await page.waitForTimeout(350);
}
await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 8000 });
await page.waitForTimeout(1200);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, 'shots', '20-pause-panel.png') });
const pauseState = await page.evaluate(() => ({
  hudPaused: window.__game.scene.getScene('Hud').paused,
  gameActive: window.__game.scene.isActive('Game'),
}));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const resumed = await page.evaluate(() => window.__game.scene.isActive('Game'));

// jump to the Death phase
await page.evaluate(() => window.__game.scene.getScene('Game').debugSetTime(594));
await page.waitForTimeout(4000);
await page.screenshot({ path: path.join(OUT, 'shots', '21-death-phase.png') });
const boss = await page.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  const death = [...g.enemies.tracked].find((e) => e.typeId === 'death');
  return {
    deathPresent: !!death,
    deathSpeed: death ? death.enemySpeed : null,
    music: g.music ? g.music.key : null,
    musicPlaying: !!(g.music && g.music.isPlaying),
    t: Math.round(g.runSeconds),
    hp: Math.round(g.hp),
  };
});

// survive-or-die for up to 45s
const t0 = Date.now();
let over = false;
let finalState = null;
while (Date.now() - t0 < 45000) {
  const st = await page.evaluate(() => {
    const g = window.__game.scene.getScene('Game');
    return { over: window.__game.scene.isActive('GameOver'), hp: Math.round(g.hp), t: Math.round(g.runSeconds) };
  });
  if (st.over) { over = true; finalState = st; break; }
  // kite away from the nearest threat
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyW');
}
if (over) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'shots', '22-run-result.png') });
}
const result = await page.evaluate(() => {
  const go = window.__game.scene.getScene('GameOver');
  const g = window.__game.scene.getScene('Game');
  return {
    gameOverActive: window.__game.scene.isActive('GameOver'),
    result: go && go.result ? { victory: go.result.victory, time: Math.round(go.result.time), kills: go.result.kills, level: go.result.level, curse: go.result.curse } : null,
    ranTo: Math.round(g.runSeconds),
  };
});

const report = { pauseState, resumed, boss, over, finalState, result, errors: [...new Set(errors)], errorCount: errors.length };
fs.writeFileSync(path.join(OUT, 'endgame.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();