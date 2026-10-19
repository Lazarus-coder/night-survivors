import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('console', (m) => logs.push(`${m.type()}:${m.text()}`.slice(0, 200)));
p.on('pageerror', (e) => logs.push(`ERR:${e.message}`));
await p.goto('http://localhost:5173/');
await p.waitForTimeout(2500);
console.log('after load', await p.evaluate(() => ({
  visibility: document.visibilityState,
  active: window.__game.scene.getScenes(true).map((s) => s.scene.key),
  hasFocus: window.__game.hasFocus,
  fps: Math.round(window.__game.loop.actualFps),
})));

await p.evaluate(() => {
  window.__hits = [];
  window.addEventListener('keydown', (e) => window.__hits.push(e.code + '/' + e.key), true);
});
await p.keyboard.press('Space');
await p.waitForTimeout(800);
console.log('keys seen', await p.evaluate(() => window.__hits));
console.log('after space', await p.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key)));

await p.mouse.click(640, 360);
await p.waitForTimeout(1000);
console.log('after click', await p.evaluate(() => ({
  active: window.__game.scene.getScenes(true).map((s) => s.scene.key),
  menu: !!window.__game.scene.getScene('Game')?.runSeconds,
})));
await p.waitForTimeout(2500);
console.log('game state', await p.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  if (!g) return null;
  return { t: g.runSeconds, enemies: g.enemies?.aliveCount, hp: g.hp, kills: g.kills, fps: Math.round(window.__game.loop.actualFps) };
}));
console.log('LOGS', logs.slice(0, 30));
await b.close();
