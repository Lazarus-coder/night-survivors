// Tile-sheet inspector: renders a labelled contact sheet + per-tile alpha/colour stats
// so sprite indices can be chosen from evidence instead of guesswork.
//
//   node scripts/tile-inspect.mjs --src /assets/sprites/kenney_rl_sheet.png \
//        --tile 16 --margin 1 --spacing 1 --zoom 3 --out test-results/grid.png
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
  return acc;
}, []));

const SRC = args.src;
const TILE = Number(args.tile || 16);
const MARGIN = Number(args.margin ?? 0);
const SPACING = Number(args.spacing ?? 0);
const ZOOM = Number(args.zoom || 3);
const OUT = args.out || 'test-results/grid.png';
const STATS = args.stats || 'test-results/tiles.json';
const BASE = args.base || 'http://localhost:5173';
const PICK = args.pick ? args.pick.split(',').map(Number) : null;

fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });

const result = await page.evaluate(async ({ SRC, TILE, MARGIN, SPACING, ZOOM, PICK }) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('load failed')); img.src = SRC; });
  const step = TILE + SPACING;
  const cols = Math.floor((img.width - MARGIN + SPACING) / step);
  const rows = Math.floor((img.height - MARGIN + SPACING) / step);

  // stats canvas (1px per tile region)
  const sc = document.createElement('canvas');
  sc.width = img.width;
  sc.height = img.height;
  const sctx = sc.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0);

  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = MARGIN + c * step;
      const y = MARGIN + r * step;
      const d = sctx.getImageData(x, y, TILE, TILE).data;
      let opaque = 0;
      let rr = 0;
      let gg = 0;
      let bb = 0;
      let minX = 99;
      let maxX = -1;
      let minY = 99;
      let maxY = -1;
      for (let py = 0; py < TILE; py++) {
        for (let px = 0; px < TILE; px++) {
          const i = (py * TILE + px) * 4;
          if (d[i + 3] > 24) {
            opaque++;
            rr += d[i];
            gg += d[i + 1];
            bb += d[i + 2];
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
      }
      tiles.push({
        index: r * cols + c, col: c, row: r,
        opaque,
        fill: +(opaque / (TILE * TILE)).toFixed(2),
        rgb: opaque ? [Math.round(rr / opaque), Math.round(gg / opaque), Math.round(bb / opaque)] : null,
        box: opaque ? [maxX - minX + 1, maxY - minY + 1] : null,
      });
    }
  }

  // labelled contact sheet (full grid, or only the requested picks)
  const pad = 18;
  const cell = TILE * ZOOM;
  const list = PICK ? PICK.map((i) => tiles[i]).filter(Boolean) : tiles;
  const pcols = PICK ? Math.min(list.length, 8) : cols;
  const prows = PICK ? Math.ceil(list.length / pcols) : rows;
  const out = document.createElement('canvas');
  out.width = pcols * (cell + 2) + pad;
  out.height = prows * (cell + 2 + (PICK ? 18 : 12)) + pad;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#101018';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = false;
  for (let n = 0; n < list.length; n++) {
    const t = list[n];
    const c = PICK ? n % pcols : n % cols;
    const r = PICK ? (n / pcols) | 0 : (n / cols) | 0;
    const dx = pad / 2 + c * (cell + 2);
    const dy = pad + r * (cell + 2 + (PICK ? 18 : 12));
    ctx.fillStyle = '#1c1c28';
    ctx.fillRect(dx, dy, cell, cell);
    ctx.drawImage(img, MARGIN + t.col * step, MARGIN + t.row * step, TILE, TILE, dx, dy, cell, cell);
    if (PICK || t.opaque > 4) {
      ctx.fillStyle = '#ffe873';
      ctx.font = '11px monospace';
      ctx.fillText(`${t.index} f${t.fill}${t.rgb ? ' ' + t.rgb.join(',') : ''}`, dx + 1, dy + cell + (PICK ? 14 : 11));
    }
  }
  return { cols, rows, width: img.width, height: img.height, tiles, png: out.toDataURL('image/png') };
}, { SRC, TILE, MARGIN, SPACING, ZOOM, PICK });

fs.writeFileSync(path.resolve(OUT), Buffer.from(result.png.split(',')[1], 'base64'));
fs.writeFileSync(path.resolve(STATS), JSON.stringify({ src: SRC, cols: result.cols, rows: result.rows, tiles: result.tiles }, null, 2));

const filled = result.tiles.filter((t) => t.opaque > 4).length;
console.log(`${SRC}: ${result.width}x${result.height} -> ${result.cols}x${result.rows} grid = ${result.cols * result.rows} tiles (${filled} non-empty)`);
console.log(`grid image -> ${OUT}\nstats    -> ${STATS}`);
await browser.close();
