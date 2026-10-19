// Procedural pixel-art fallback. Keeps the game fully playable when no external
// asset pack is present; BootScene overrides these keys if real art loads.

const PAL = {
  k: 0x14121f, d: 0x2a2440, b: 0x4a3a76, p: 0x7a5ea8, r: 0xd4436a, o: 0xe8894a,
  y: 0xf2d64b, g: 0x54c17a, h: 0x2f8f56, t: 0x2fa8a0, u: 0x4f7fd6, v: 0x2f4fa6,
  s: 0xe4dcc8, w: 0xf6f8ff, n: 0x9a8467, m: 0x6b5540, c: 0x9aa6bd, e: 0x22e0ff,
};

const ART = {
  hero: [
    '....kkkk....',
    '...kwwwwk...',
    '...kwuyuk...',
    '...kwwwwk...',
    '..kkccccck..',
    '.kucwcwcwuk.',
    '.kucwwwwwuk.',
    '..kccccckk..',
    '..kvvvvvk...',
    '...kn..nk...',
    '...kn..nk...',
    '...kk..kk...',
  ],
  e_zombie: [
    '....kkkk....',
    '...khhhhk...',
    '...khkshk...',
    '...khhhhk...',
    '..kknggnkk..',
    '.knggggggnk.',
    '.kngkmamgnk.',
    '..knggggnk..',
    '...kmddmk...',
    '...km..mk...',
    '...kk..kk...',
    '............',
  ],
  e_bat: [
    '............',
    '.k........k.',
    'kkk......kkk',
    'kbkk....kkbk',
    'kppbkkkkbppk',
    '.kpwwkkwwpk.',
    '..kwkwkkwk..',
    '...kbbbbb...',
    '....kkkkk...',
    '............',
    '............',
    '............',
  ],
  e_slime: [
    '............',
    '.....kk.....',
    '....kgggk...',
    '...kgggggk..',
    '..kggwggwggk',
    '..kggggggggk',
    '.kggggggggggk',
    '.kghgggggghgk',
    '.kkhhhhhhhkk.',
    '............',
    '............',
    '............',
  ],
  e_ghost: [
    '....kkkk....',
    '...kpppppk..',
    '..kpwekwepk.',
    '..kpppppppk.',
    '..kpppppppk.',
    '..kpppppppk.',
    '..kpppppppk.',
    '..kpdpddpk..',
    '..kpdpdppk..',
    '..k.k.k.k...',
    '............',
    '............',
  ],
  e_skeleton: [
    '....kkkk....',
    '...kssssk...',
    '...ksksks...',
    '...kssssk...',
    '....ksck....',
    '..ksscsssk..',
    '.kskscsksk..',
    '..ksscsssk..',
    '....kscsk...',
    '....ksksk...',
    '....k.k.k...',
    '............',
  ],
  e_wolf: [
    '............',
    '.kk......kk.',
    'knnk....knnk',
    'knnnk..knnnk',
    '.kmmmmmmmmk.',
    '.kmwmmmmwmk.',
    '.kmmmmmmmkk.',
    '.kmmmmmmmmk.',
    '..kmmkkmmmk.',
    '..kmk..kmk..',
    '..kk....kk..',
    '............',
  ],
  e_ogre: [
    '...kkkkkk...',
    '..kggggggk..',
    '..gkwgkwggg.',
    '..kgggggggk.',
    '..kkgmmmgkk.',
    '.knnnnnnnnnk',
    'knnmnnnnnmnnk',
    'knnnnnnnnnnnk',
    '.knnnnnnnnk..',
    '..knnk.knnk..',
    '..kmk...kmk..',
    '..kkk...kkk..',
  ],
  e_death: [
    '....kkkk....',
    '...kddddk...',
    '..kdkwwkdk..',
    '..kdwkwwkdk.',
    '..kddddddk..',
    '.kkddddddkk.',
    'kdkddddddkdk',
    'kddkddddkddk',
    '.kdkddddkdk.',
    '..kddwwddk..',
    '..kddddddk..',
    '..kk....kk..',
  ],
  w_knife: ['........', '......ck', '.....ckw', 'kk..ckw.', 'ckkkkw..', '.ckcc...', '........'],
  w_axe: ['....kkkk', '..kkcccckk', '.kccccccck', 'kcwccccck.', 'kcccccck..', '.kckkk....', '..k.......', '..k.......'],
  w_wand: ['...kk...', '..kecek.', '..kecek.', '..kecek.', '...kk...', '....k...', '....kn..', '.....k..'],
  w_garlic: ['...kk...', '..kgggk.', '.kggwggk.', 'kgggggggk.', 'kggrggrgk.', '.kgggggk..', '..kkggk...', '...k.k....'],
  w_flask: ['...k....', '..kwk...', '.kwttyk..', 'kwtssswk.', 'kwsrrrswk', 'kwsrrrswk', '.kwssswnk.', '..kkkkk...'],
  w_bolt: ['.....kk.', '....kyy.', '...kyy..', '..kyyyk.', '.kkkkkkk', '....kyy.', '...kyy..', '..kk....'],
  gem: ['..kkk.', '.kwswk', 'ksryks', 'ksrrsk', '.krrsk', '..kk..'],
  coin: ['..kkk.', '.kyyyyk', 'kynnnynk', 'kyntnyyk', '.kyyyyk', '..kkk.'],
  chest: ['kkkkkkkk', 'knnnnnnk', 'knmsmmnk', 'kkkkkkkk', 'kmccccmk', 'kmkyykkm', 'kmccccmk', 'kkkkkkkk'],
  potion: ['..kk...', '.kwswk.', '.krrrsk', '.krrrsk', '..kk...'],
};

function drawPixelMap(scene, key, rows, scale, anchorY = 1) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false, textureManager: scene.textures });
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ') continue;
      const color = PAL[ch] ?? PAL.r;
      g.fillStyle(color, 1);
      g.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  g.generateTexture(key, w * scale, h * scale);
  g.destroy();
  void anchorY;
}

function makeGroundTile(scene, key = 'tile_grass', size = 96) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false, textureManager: scene.textures });
  g.fillStyle(0x272536, 1);
  g.fillRect(0, 0, size, size);
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const tones = [0x2f2c42, 0x37334c, 0x232130, 0x413b58];
  for (let i = 0; i < 300; i++) {
    g.fillStyle(tones[(rnd() * tones.length) | 0], 1);
    g.fillRect((rnd() * size) | 0, (rnd() * size) | 0, 3, 3);
  }
  g.lineStyle(1, 0x1b1a26, 0.35);
  g.strokeRect(0, 0, size, size);
  g.generateTexture(key, size, size);
  g.destroy();
}

function makePropTile(scene, key = 'tile_props', size = 352) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false, textureManager: scene.textures });
  let seed = 777;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const tuft = (x, y, c) => {
    g.fillStyle(c, 1);
    g.fillRect(x, y, 2, 7);
    g.fillRect(x + 3, y + 3, 2, 4);
    g.fillRect(x - 3, y + 2, 2, 5);
  };
  const rock = (x, y) => {
    g.fillStyle(0x4a4760, 1);
    g.fillRect(x, y, 12, 8);
    g.fillStyle(0x5d597a, 1);
    g.fillRect(x + 2, y - 3, 8, 4);
    g.fillStyle(0x2c2a3a, 1);
    g.fillRect(x, y + 8, 12, 2);
  };
  const crack = (x, y) => {
    g.fillStyle(0x1c1b28, 1);
    for (let i = 0; i < 5; i++) g.fillRect(x + i * 5, y + ((i % 2) * 3), 5, 2);
  };
  const bone = (x, y) => {
    g.fillStyle(0x6f6a5e, 1);
    g.fillRect(x, y, 9, 2);
    g.fillRect(x - 2, y - 1, 3, 3);
    g.fillRect(x + 8, y, 3, 3);
  };
  for (let i = 0; i < 7; i++) tuft(20 + rnd() * (size - 40) || 30, 20 + rnd() * (size - 40) || 40, 0x3f5a49);
  rock(60, 90);
  rock(240, 250);
  crack(150, 60);
  crack(70, 280);
  bone(200, 140);
  bone(300, 60);
  g.fillStyle(0x3a3550, 1);
  g.fillRect(120, 200, 3, 3);
  g.fillRect(280, 320, 3, 3);
  g.generateTexture(key, size, size);
  g.destroy();
}

function makeCircle(scene, key, radius, color, alpha = 1) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false, textureManager: scene.textures });
  g.fillStyle(color, alpha);
  g.fillCircle(radius, radius, radius);
  g.generateTexture(key, radius * 2, radius * 2);
  g.destroy();
}

function makeRing(scene, key, radius, color, alpha = 0.75) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false, textureManager: scene.textures });
  g.lineStyle(3, color, alpha);
  g.strokeCircle(radius + 3, radius + 3, radius);
  g.generateTexture(key, (radius + 3) * 2, (radius + 3) * 2);
  g.destroy();
}

function makeBeam(scene, key = 'fx_beam') {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false, textureManager: scene.textures });
  g.fillStyle(0xf2f8ff, 1);
  g.fillRect(0, 0, 4, 32);
  g.fillStyle(0x9fd8ff, 0.7);
  g.fillRect(1, 0, 2, 32);
  g.generateTexture(key, 4, 32);
  g.destroy();
}

function makeBolt(scene, key = 'fx_bolt') {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false, textureManager: scene.textures });
  g.fillStyle(0xf7f6ff, 1);
  g.fillTriangle(20, 0, 30, 0, 22, 34);
  g.fillTriangle(24, 26, 40, 26, 12, 70);
  g.fillStyle(0xffe873, 0.8);
  g.fillRect(18, 0, 6, 30);
  g.generateTexture(key, 52, 72);
  g.destroy();
}

export function buildFallbackTextures(scene, scale = 4) {
  for (const [key, rows] of Object.entries(ART)) {
    const s = key === 'e_death' ? scale + 2 : scale - (key.startsWith('gem') || key.startsWith('coin') ? 1 : 0);
    drawPixelMap(scene, key, rows, Math.max(2, s));
  }
  makeGroundTile(scene);
  makePropTile(scene);
  makeCircle(scene, 'fx_dot', 16, 0xffffff);
  makeCircle(scene, 'fx_shadow', 12, 0x000000, 0.34);
  makeRing(scene, 'fx_ring', 60, 0xbfa8ff, 0.55);
  makeRing(scene, 'fx_pool', 74, 0x6fe0ff, 0.6);
  makeBeam(scene);
  makeBolt(scene);
}
