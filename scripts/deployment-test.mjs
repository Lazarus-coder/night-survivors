// Build first, then serve dist exactly as a static host would at each mount point.
// Usage: npm run test:deployment
// Live site (no build): node scripts/deployment-test.mjs https://example.com/game/
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { ASSET_MANIFEST } from '../src/data/assets.js';

const DIST = path.resolve(import.meta.dirname, '../dist');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.ogg': 'audio/ogg', '.ttf': 'font/ttf',
};
const remote = process.argv[2] ? new URL(process.argv[2]) : null;
if (remote) assert.ok(['http:', 'https:'].includes(remote.protocol), 'Expected an HTTP(S) site URL');
const bases = remote ? [new URL('.', remote).pathname] : ['/', '/night-survivors/'];
const targets = bases.flatMap((base) => ['', 'index.html'].map((entry) => ({ base, entry })));

for (const { base, entry } of targets) {
  test(`game loads all assets and starts at ${remote?.origin || 'local'}${base}${entry}`, { timeout: 90000 }, async (t) => {
    let origin = remote?.origin;
    if (!origin) {
      const server = createServer(async (req, res) => {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        if (!pathname.startsWith(base)) {
          res.writeHead(404).end();
          return;
        }
        const file = path.resolve(DIST, pathname.slice(base.length) || 'index.html');
        if (!file.startsWith(`${DIST}${path.sep}`)) {
          res.writeHead(404).end();
          return;
        }
        try {
          const body = await readFile(file);
          res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
          res.end(body);
        } catch {
          res.writeHead(404).end();
        }
      });
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      t.after(() => new Promise((resolve) => server.close(resolve)));
      origin = `http://127.0.0.1:${server.address().port}`;
    }
    const browser = await chromium.launch({
      channel: 'chrome', headless: true, args: ['--mute-audio'],
    });
    t.after(() => browser.close());
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(45000);
    const errors = [];
    const responses = new Map();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('response', (response) => {
      responses.set(new URL(response.url()).pathname, response.status());
    });
    await page.route('**/*', (route) => (
      route.request().method() === 'GET' && new URL(route.request().url()).origin === origin
        ? route.continue() : route.abort()
    ));
    const response = await page.goto(`${origin}${base}${entry}`);
    assert.equal(response.status(), 200, 'Game entry page must return HTTP 200');
    await page.waitForFunction(() => window.__game?.scene.isActive('Menu'));
    assert.deepEqual(await page.evaluate(() => window.__game.scene.getScene('Boot').loadFailed), [],
      'Original assets must load without procedural fallback');

    const missing = await page.evaluate((manifest) => {
      const game = window.__game;
      return manifest.filter((entry) => {
        if (entry.type === 'font') {
          return ![...document.fonts].some((face) => (
            face.family === (entry.family || 'PixelFont') && face.status === 'loaded'
          ));
        }
        return entry.type === 'audio'
          ? !game.cache.audio.exists(entry.key)
          : !game.textures.exists(entry.key);
      }).map((entry) => entry.key);
    }, ASSET_MANIFEST);
    assert.deepEqual(missing, [], 'All vendored textures, audio and fonts must load without fallback');
    for (const entry of ASSET_MANIFEST) {
      const pathname = `${base}${entry.url.replace(/^\//, '')}`;
      assert.equal(responses.get(pathname), 200, pathname);
    }

    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__game.scene.isActive('Game'));
    const startX = await page.evaluate(() => window.__game.scene.getScene('Game').player.x);
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction((x) => window.__game.scene.getScene('Game').player.x > x + 20, startX);
    await page.keyboard.up('ArrowRight');
    assert.equal(await page.evaluate(() => (
      window.__game.scene.getScene('Game').music?.isPlaying
    )), true, 'Vendored background music must play after starting');
    assert.deepEqual(errors, [], 'No browser or game errors');
  });
}
