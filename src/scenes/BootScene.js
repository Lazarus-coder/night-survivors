import Phaser from 'phaser';
import { ASSET_MANIFEST } from '../data/assets.js';
import { buildFallbackTextures } from '../systems/TextureFactory.js';
import { TD, GROUND } from '../data/sprites.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.loadFailed = [];
    this.load.on('loaderror', (file) => {
      this.loadFailed.push(file.key);
      console.warn('[Boot] asset unavailable, falling back to procedural art:', file.key);
    });

    for (const entry of ASSET_MANIFEST) {
      if (entry.type === 'spritesheet') {
        this.load.spritesheet(entry.key, entry.url, {
          frameWidth: entry.frameWidth,
          frameHeight: entry.frameHeight,
          spacing: entry.spacing ?? 0,
          margin: entry.margin ?? 0,
        });
      } else if (entry.type === 'audio') {
        this.load.audio(entry.key, entry.url);
      } else if (entry.type === 'font') {
        // loaded through the CSS font engine in create(), Phaser cannot decode ttf
      } else {
        this.load.image(entry.key, entry.url);
      }
    }
  }

  async create() {
    await this.loadPixelFont();
    buildFallbackTextures(this, 4);
    this.composeGroundTiles();
    this.scene.start('Menu');
  }

  loadPixelFont() {
    const fonts = ASSET_MANIFEST.filter((e) => e.type === 'font');
    if (!fonts.length || !window.FontFace) return Promise.resolve();
    return Promise.all(fonts.map(async (f) => {
      const family = f.family || 'PixelFont';
      const face = new FontFace(family, `url(${f.url})`);
      try {
        await face.load();
        document.fonts.add(face);
        this.pixelFontFamily = family;
      } catch (err) {
        console.warn('[Boot] font failed to load', f.key, err.message);
      }
    }));
  }

  // Build two seamless-ish tiles from sheet frames: a 64x64 floor and a 256x256 prop layer.
  composeGroundTiles() {
    if (!this.textures.exists(TD)) return;
    const src = this.textures.get(TD).getSourceImage();
    const draw = (key, size, cells, scale) => {
      if (this.textures.exists(key)) return;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#1d1b28';
      ctx.fillRect(0, 0, size, size);
      const cols = Math.floor(size / (16 * scale));
      cells.forEach((frame, i) => {
        const fx = (i % cols) * 16 * scale;
        const fy = Math.floor(i / cols) * 16 * scale;
        const sx = (frame % 12) * 16;
        const sy = Math.floor(frame / 12) * 16;
        ctx.drawImage(src, sx, sy, 16, 16, fx, fy, 16 * scale, 16 * scale);
      });
      this.textures.addCanvas(key, canvas);
    };

    const pick = (list, n) => Array.from({ length: n }, (_, i) => list[i % list.length]);
    // floor: near-identical bricks so the ground reads as one surface, not a lattice
    draw('tile_floor', 64, pick(GROUND.bricks, 16), 1);

    const propCells = new Array(256).fill(-1);
    let seed = 1337;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 3; i++) {
      const p = GROUND.props[(rnd() * GROUND.props.length) | 0];
      propCells[(rnd() * 256) | 0] = p;
    }
    // 16x16 cells of 16px = 256px sheet region; -1 stays transparent
    if (!this.textures.exists('tile_props_art')) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      propCells.forEach((frame, i) => {
        if (frame < 0) return;
        const fx = (i % 16) * 16;
        const fy = Math.floor(i / 16) * 16;
        ctx.drawImage(src, (frame % 12) * 16, Math.floor(frame / 12) * 16, 16, 16, fx, fy, 16, 16);
      });
      this.textures.addCanvas('tile_props_art', canvas);
    }
  }
}
