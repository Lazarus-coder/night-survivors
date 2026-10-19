export const VIEW = { w: 1280, h: 720 };

export const RUN = {
  deathSpawnAt: 595,
  victoryAt: 635,
  maxEnemies: 240,
  maxProjectiles: 140,
  maxGems: 160,
  despawnRadius: 1450,
  spawnPad: 90,
};

export const PLAYER = {
  maxHp: 130,
  speed: 205,
  radius: 13,
  armor: 0,
  iframesMs: 800,
  pickupRadius: 30,
  magnetRadius: 200,
  reviveOnce: false,
};

export const WEAPON_SLOTS = 6;
export const PASSIVE_SLOTS = 6;

export function xpToNext(level) {
  if (level <= 1) return 4;
  if (level <= 20) return Math.round(4 + (level - 1) * 3.4);
  const late = level - 20;
  return Math.round(69 + late * 18 + late * late * 1.3);
}

// Enemy pressure is a smooth spawns-per-second curve instead of chunky bursts.
export const SPAWN = {
  baseRate: 0.85,
  ratePerMinute: 0.44,
  curseRate: 0.18,
  curseXp: 0.1,
  maxCurse: 3,
};

export const DROPS = {
  foodChance: 0.09,
  foodHeal: 18,
  eliteHeal: 22,
};

export const SaveKey = 'night-survivors.save.v1';
