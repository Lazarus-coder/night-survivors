// Build first; block each vendored sheet to exercise the real startup fallback.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { SPRITES, TD, RL } from '../src/data/sprites.js';
import { ASSET_MANIFEST } from '../src/data/assets.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'test-results');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf' };

test('game renders with missing sprite sheets or all assets unavailable', async (t) => {
  await mkdir(path.join(OUT, 'shots'), { recursive: true });
  await mkdir(path.join(OUT, 'tmp'), { recursive: true });
  process.env.TMPDIR = path.join(OUT, 'tmp');
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(DIST, pathname.slice(1) || 'index.html');
    if (!file.startsWith(`${DIST}${path.sep}`)) return res.writeHead(404).end();
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
  t.after(() => browser.close());

  for (const blocked of [[], [TD], [RL], [TD, RL], ASSET_MANIFEST.map((entry) => entry.key)]) {
    const name = blocked.length > 2 ? 'all-assets' : blocked.join('+') || 'real-sheets';
    await t.test(name, async () => {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      page.setDefaultTimeout(20000);
      const errors = [];
      const failed = new Set();
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        const asset = ASSET_MANIFEST.find((entry) => entry.url === url.pathname);
        if (asset && blocked.includes(asset.key)) {
          failed.add(asset.key);
          return route.fulfill({ status: 404, body: '' });
        }
        return route.continue();
      });
      try {
        await page.goto(origin);
        await page.waitForFunction(() => window.__game?.scene.isActive('Menu'), null, { timeout: 20000 });
        assert.deepEqual([...failed].sort(), [...blocked].sort(), 'Requested assets must actually fail');
        const textures = await page.evaluate(({ sprites, sheets }) => {
          const game = window.__game;
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 16;
          const context = canvas.getContext('2d');
          const missing = [];
          for (const [name, sprite] of Object.entries(sprites)) {
            if (!game.textures.exists(sprite.tex) || !game.textures.get(sprite.tex).has(sprite.frame)) {
              missing.push(`${name}: missing frame`);
              continue;
            }
            const texture = game.textures.get(sprite.tex);
            const frame = texture.get(sprite.frame);
            if (frame.cutWidth !== 16 || frame.cutHeight !== 16) missing.push(`${name}: invalid dimensions`);
            context.clearRect(0, 0, 16, 16);
            context.drawImage(frame.source.image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, 16, 16);
            if (!context.getImageData(0, 0, 16, 16).data.some((value, index) => index % 4 === 3 && value)) {
              missing.push(`${name}: empty pixels`);
            }
          }
          return {
            missing,
            procedural: sheets.filter((key) => game.textures.get(key).getSourceImage() instanceof HTMLCanvasElement),
            composedTerrain: ['tile_floor', 'tile_props_art'].map((key) => game.textures.exists(key)),
          };
        }, { sprites: SPRITES, sheets: [TD, RL] });
        assert.deepEqual(textures.missing, [], 'Every entity and icon must resolve to a nonempty 16x16 frame');
        assert.deepEqual(textures.procedural.sort(), blocked.filter((key) => key === TD || key === RL).sort(), 'Only missing sheets may be replaced');
        assert.deepEqual(textures.composedTerrain, [!blocked.includes(TD), !blocked.includes(TD)], 'Terrain sampling must only use the original sheet layout');

        await page.keyboard.press('Space');
        await page.waitForFunction(() => window.__game.scene.isActive('Game'));
        const startX = await page.evaluate((knife) => {
          const game = window.__game.scene.getScene('Game');
          const player = game.player;
          const enemy = game.enemies.spawn('bat', player.x + 180, player.y, { hp: 10000 });
          const shot = game.weapons.spawnShot('projectile', {
            ...knife, x: player.x - 100, y: player.y, vx: 0, vy: 0,
            damage: 0, pierce: 1, life: 10, angle: 0, weapon: 'knife',
          });
          window.__fallbackProbe = { player, enemy, shot };
          return player.x;
        }, SPRITES.knife);
        await page.keyboard.down('ArrowRight');
        await page.waitForFunction((x) => window.__game.scene.getScene('Game').player.x > x + 20, startX);
        await page.keyboard.up('ArrowRight');
        const sprites = await page.evaluate(() => Object.entries(window.__fallbackProbe).map(([name, sprite]) => ({
          name, active: sprite.active, visible: sprite.visible, texture: sprite.texture.key,
          frameWidth: sprite.frame.cutWidth, frameHeight: sprite.frame.cutHeight,
        })));
        for (const sprite of sprites) {
          assert.equal(sprite.active && sprite.visible, true, `${sprite.name} must render`);
          assert.equal(sprite.texture, TD, `${sprite.name} must use the compatible sheet`);
          assert.equal(sprite.frameWidth, 16);
          assert.equal(sprite.frameHeight, 16);
        }
        await page.screenshot({ path: path.join(OUT, 'shots', `fallback-${name}.png`) });
        assert.deepEqual(errors, [], 'No runtime errors while loading, moving, or rendering combat');
      } finally {
        await page.close();
      }
    });
  }
});
