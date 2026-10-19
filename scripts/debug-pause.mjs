import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5173/');
await p.waitForFunction(() => window.__game && window.__game.scene.isActive('Menu'), null, { timeout: 20000 });
await p.keyboard.press('Space');
await p.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 15000 });
await p.waitForTimeout(2500);

const before = await p.evaluate(() => {
  const g = window.__game;
  const hud = g.scene.getScene('Hud');
  return {
    hudStatus: hud.sys.settings.status,
    hudVisible: hud.sys.settings.visible,
    hudInputEnabled: hud.input.enabled,
    kbEnabled: hud.input.keyboard.enabled,
    hasEscKey: !!hud.k?.ESC,
    gameActive: g.scene.isActive('Game'),
    hasFocus: g.hasFocus,
    upCountSample: (hud.upCount = 0),
  };
});
console.log('before', before);

// count the Hud update loop
await p.evaluate(() => {
  const hud = window.__game.scene.getScene('Hud');
  const orig = hud.update.bind(hud);
  hud.update = (...a) => { hud.upCount += 1; return orig(...a); };
});
await p.waitForTimeout(700);
const loopInfo = await p.evaluate(() => ({
  upCount: window.__game.scene.getScene('Hud').upCount,
  escIsDown: window.__game.scene.getScene('Hud').k.ESC.isDown,
}));
console.log('loop', loopInfo);

await p.keyboard.down('Escape');
await p.waitForTimeout(120);
const during = await p.evaluate(() => {
  const hud = window.__game.scene.getScene('Hud');
  const Phaser = window.Phaser;
  return {
    escIsDown: hud.k.ESC.isDown,
    escJustDown: Phaser ? Phaser.Input.Keyboard.JustDown(hud.k.ESC) : 'no-phaser-global',
    paused: hud.paused,
    gameActive: window.__game.scene.isActive('Game'),
  };
});
await p.keyboard.up('Escape');
console.log('during escape', during);

await p.waitForTimeout(500);
const after = await p.evaluate(() => {
  const hud = window.__game.scene.getScene('Hud');
  return { paused: hud.paused, gameActive: window.__game.scene.isActive('Game'), hasPanel: !!hud.pausePanel };
});
console.log('after', after);
console.log('errors', errs);
await b.close();