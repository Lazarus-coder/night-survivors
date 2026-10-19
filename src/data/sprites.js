// Central art mapping. Every index was verified visually with scripts/tile-inspect.mjs
// against the vendored sheets — change an index here, not in the gameplay code.
//
// TD = Kenney "Tiny Dungeon" 16x16, packed 12 cols x 11 rows, CC0
// RL = Kenney "Roguelike/RPG pack" 16x16 (margin 1, spacing 1), CC0

export const TD = 'kenney_td_tiles';
export const RL = 'kenney_rl_sheet';

// verified TD indices: 84 mage · 85 young man · 86 bandit · 87 elder · 88 cultist
// 96/97 knights · 100 pale one · 108 slime · 110 crab · 111 boar · 120 bat
// 121 ghost · 122 spider · 123 beetle · 124 beast
export const SPRITES = {
  hero: { tex: TD, frame: 96 },
  mage: { tex: TD, frame: 84 },

  villager: { tex: TD, frame: 85 },
  bandit: { tex: TD, frame: 86 },
  zombie: { tex: TD, frame: 87 },
  cultist: { tex: TD, frame: 88 },
  pale: { tex: TD, frame: 100 },
  blade: { tex: TD, frame: 97 },

  blob: { tex: TD, frame: 108 },
  crab: { tex: TD, frame: 110 },
  boar: { tex: TD, frame: 111 },
  bat: { tex: TD, frame: 120 },
  ghost: { tex: TD, frame: 121 },
  spider: { tex: TD, frame: 122 },
  beetle: { tex: TD, frame: 123 },
  beast: { tex: TD, frame: 124 },

  knightElite: { tex: TD, frame: 97 },
  mageElite: { tex: TD, frame: 84 },
  death: { tex: TD, frame: 121 },

  // weapons: 104 dagger · 105 axe head · 106 long sword · 117 hammer · 118 twin axe
  // 74 cauldron · 114 green vial · 116 blue vial · 62 slash marks
  knife: { tex: TD, frame: 104 },
  axe: { tex: TD, frame: 105 },
  hammer: { tex: TD, frame: 117 },
  hammerGold: { tex: TD, frame: 119 },
  cauldron: { tex: TD, frame: 74 },
  vial: { tex: TD, frame: 114 },
  vialBlue: { tex: TD, frame: 116 },
  slash: { tex: TD, frame: 62 },
  sword: { tex: TD, frame: 106 },
  twinAxe: { tex: TD, frame: 118 },
  torchCyan: { tex: TD, frame: 130 },
  blade: { tex: TD, frame: 97 },

  // passives
  might: { tex: TD, frame: 97 },
  armor: { tex: TD, frame: 29 },
  swift: { tex: TD, frame: 120 },
  cooldown: { tex: TD, frame: 41 },
  area: { tex: TD, frame: 60 },
  amount: { tex: TD, frame: 109 },
  magnet: { tex: TD, frame: 56 },
  duration: { tex: TD, frame: 125 },
  growth: { tex: TD, frame: 114 },

  // pickups
  gem: { tex: TD, frame: 115 },
  gemBig: { tex: TD, frame: 116 },
  coin: { tex: RL, frame: 659 },
  chest: { tex: TD, frame: 90 },
  chestOpen: { tex: TD, frame: 92 },
  potion: { tex: TD, frame: 113 },
};

// Terrain frames used to compose the scrolling ground / prop layers.
// 48/49/50 are plain full-fill dirt tiles (tinted dark for the night floor);
// 64 (grave cross) and 62 (slash scratches) are the only decor tiles that keep
// transparency — full-fill tiles would show up as solid squares.
export const GROUND = {
  bricks: [48, 49, 49, 50, 48, 49, 50, 49],
  dirt: [48, 49, 50, 51],
  props: [64, 62],
};

export function spriteOf(key) {
  return SPRITES[key] || { tex: TD, frame: 0 };
}