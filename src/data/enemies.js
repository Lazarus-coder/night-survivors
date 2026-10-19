import { SPRITES } from './sprites.js';

// Enemy roster. `from`/`to` are run-seconds windows in which the type may spawn.
// behavior: seek | zigzag | dash | shoot | split
// Art comes from one CC0 sheet — see src/data/sprites.js.
const art = (key) => ({ tex: SPRITES[key].tex, frame: SPRITES[key].frame });

export const ENEMIES = {
  bat: {
    id: 'bat', name: '蝙蝠', ...art('bat'), hp: 6, dmg: 6, speed: 132, xp: 1, coins: 1,
    r: 11, weight: 6, from: 0, to: 600, behavior: 'zigzag', knock: 1.2,
  },
  villager: {
    id: 'villager', name: '暴民', ...art('villager'), hp: 9, dmg: 7, speed: 112, xp: 1, coins: 1,
    r: 11, weight: 5, from: 0, to: 600, behavior: 'zigzag', knock: 1,
  },
  zombie: {
    id: 'zombie', name: '尸兵', ...art('zombie'), hp: 16, dmg: 8, speed: 60, xp: 1, coins: 1,
    r: 13, weight: 6, from: 0, to: 420, behavior: 'seek', knock: 0.5,
  },
  blob: {
    id: 'blob', name: '腐魔', ...art('blob'), hp: 24, dmg: 8, speed: 56, xp: 2, coins: 1,
    r: 14, weight: 4, from: 45, to: 480, behavior: 'split', knock: 0.8,
  },
  bloblet: {
    id: 'bloblet', name: '腐魔碎片', ...art('blob'), hp: 8, dmg: 5, speed: 98, xp: 1, coins: 0,
    r: 8, weight: 0, from: 45, to: 480, behavior: 'seek', knock: 1.5, scale: 0.55,
  },
  spider: {
    id: 'spider', name: '血蛛', ...art('spider'), hp: 18, dmg: 10, speed: 126, xp: 2, coins: 1,
    r: 12, weight: 5, from: 60, to: 600, behavior: 'zigzag', knock: 1.1,
  },
  bandit: {
    id: 'bandit', name: '行刺者', ...art('bandit'), hp: 26, dmg: 12, speed: 100, xp: 2, coins: 2,
    r: 12, weight: 4, from: 150, to: 600, behavior: 'dash', knock: 0.6, dashSpeed: 290, dashInterval: 2100,
  },
  beetle: {
    id: 'beetle', name: '甲壳魔', ...art('beetle'), hp: 40, dmg: 13, speed: 74, xp: 3, coins: 2,
    r: 14, weight: 4, from: 180, to: 600, behavior: 'dash', knock: 0.35, dashSpeed: 330, dashInterval: 1700,
  },
  cultist: {
    id: 'cultist', name: '邪教徒', ...art('cultist'), hp: 30, dmg: 10, speed: 56, xp: 3, coins: 2,
    r: 13, weight: 3, from: 210, to: 600, behavior: 'seek', knock: 0.6,
    shootInterval: 2200, bulletDmg: 9,
  },
  beast: {
    id: 'beast', name: '猎兽', ...art('beast'), hp: 52, dmg: 16, speed: 88, xp: 4, coins: 3,
    r: 14, weight: 3, from: 240, to: 600, behavior: 'dash', knock: 0.3, dashSpeed: 380, dashInterval: 1500,
  },
  crab: {
    id: 'crab', name: '铁甲蟹', ...art('crab'), hp: 140, dmg: 20, speed: 48, xp: 8, coins: 5,
    r: 19, weight: 2, from: 300, to: 600, behavior: 'seek', knock: 0.08, scale: 1.25,
  },
  boar: {
    id: 'boar', name: '狂暴野猪', ...art('boar'), hp: 96, dmg: 18, speed: 66, xp: 6, coins: 4,
    r: 16, weight: 3, from: 330, to: 600, behavior: 'dash', knock: 0.15, dashSpeed: 420, dashInterval: 1400, scale: 1.1,
  },
  pale: {
    id: 'pale', name: '苍白行者', ...art('pale'), hp: 74, dmg: 19, speed: 118, xp: 6, coins: 4,
    r: 14, weight: 3, from: 390, to: 600, behavior: 'zigzag', knock: 0.7,
  },
  // elites spawn on timed events and drop a chest
  eliteKnight: {
    id: 'eliteKnight', name: '堕落骑士', ...art('knightElite'), hp: 700, dmg: 26, speed: 58, xp: 40, coins: 30,
    r: 26, weight: 0, from: 0, to: 600, behavior: 'seek', knock: 0.02, elite: true, scale: 1.7,
  },
  eliteNecro: {
    id: 'eliteNecro', name: '死灵法师', ...art('mageElite'), hp: 950, dmg: 30, speed: 92, xp: 60, coins: 40,
    r: 24, weight: 0, from: 0, to: 600, behavior: 'zigzag', knock: 0.15, elite: true, scale: 1.8,
    shootInterval: 1500, bulletDmg: 14,
  },
  death: {
    id: 'death', name: '死神', ...art('death'), hp: 999999, dmg: 5000, speed: 212, xp: 0, coins: 0,
    r: 34, weight: 0, from: 0, to: 600, behavior: 'seek', knock: 0, boss: true, scale: 2.8,
  },
};

export const SPAWN_ORDER = [
  'bat', 'zombie', 'villager', 'blob', 'spider', 'bandit', 'beetle', 'cultist',
  'beast', 'crab', 'boar', 'pale',
];

export function eliteForMinute(min) {
  if (min < 2) return null;
  return min % 3 === 0 ? 'eliteNecro' : 'eliteKnight';
}

export function statScale(runSeconds) {
  const min = runSeconds / 60;
  return { hp: 1 + min * 0.24, dmg: 1 + min * 0.12 };
}