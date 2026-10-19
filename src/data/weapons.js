import { SPRITES } from './sprites.js';

// Weapon table. stats(level) = base + (level-1) * delta, with extra +1 count at `countAt` levels.
// kind: projectile (straight) | arc (lobbed with gravity) | homing | aura | pool | strike | orbit | chain
const A = (k) => ({ tex: SPRITES[k].tex, frame: SPRITES[k].frame });

function mk(base, delta, countAt = []) {
  return { base, delta: delta || {}, countAt };
}

export const WEAPONS = {
  knife: {
    id: 'knife', name: '飞刀', kind: 'projectile', ...A('knife'), maxLevel: 8,
    desc: '朝面向方向掷出飞刀。',
    growth: mk(
      { damage: 9, cooldown: 0.74, count: 1, speed: 640, pierce: 1, life: 0.8, radius: 9, knock: 90 },
      { damage: 2, cooldown: -0.03, pierce: 0.3 },
      [3, 5, 7],
    ),
    evolve: { passive: 'amount', passiveLevel: 3, into: 'thousandEdges' },
  },
  axe: {
    id: 'axe', name: '斧刃', kind: 'arc', ...A('axe'), maxLevel: 8,
    desc: '向上抛出斧刃，落点可穿透多个敌人。',
    growth: mk(
      { damage: 17, cooldown: 1.55, count: 1, speed: 430, pierce: 3, life: 1.7, radius: 13, knock: 130 },
      { damage: 4, pierce: 1 },
      [3, 6],
    ),
    evolve: { passive: 'might', passiveLevel: 3, into: 'crescentMoon' },
  },
  wand: {
    id: 'wand', name: '回旋锤', kind: 'homing', ...A('hammer'), maxLevel: 8,
    desc: '自动锁定最近的敌人投掷战锤。',
    growth: mk(
      { damage: 12, cooldown: 1.02, count: 1, speed: 400, pierce: 0, life: 1.6, radius: 8, knock: 60 },
      { damage: 3, cooldown: -0.06 },
      [2, 4, 6, 8],
    ),
    evolve: { passive: 'cooldown', passiveLevel: 3, into: 'holyWand' },
  },
  garlic: {
    id: 'garlic', name: '毒雾锅', kind: 'aura', ...A('cauldron'), maxLevel: 8,
    desc: '环绕自身的光环，持续伤害并击退。',
    growth: mk(
      { damage: 6, cooldown: 0.34, radius: 60, knock: 150 },
      { damage: 1.6, radius: 7, cooldown: -0.015 },
    ),
    evolve: { passive: 'area', passiveLevel: 3, into: 'soulEater' },
  },
  holyWater: {
    id: 'holyWater', name: '冰霜瓶', kind: 'pool', ...A('vial'), maxLevel: 8,
    desc: '掷出霜瓶，地面留下冻结区域。',
    growth: mk(
      { damage: 11, cooldown: 2.5, count: 1, speed: 250, life: 4.2, radius: 66, tick: 0.42 },
      { damage: 3, life: 0.35 },
      [4, 7],
    ),
    evolve: { passive: 'duration', passiveLevel: 3, into: 'laBorra' },
  },
  lightning: {
    id: 'lightning', name: '雷击', kind: 'strike', ...A('slash'), maxLevel: 8,
    desc: '随机劈向屏幕内的敌人。',
    growth: mk(
      { damage: 22, cooldown: 2.6, count: 1, radius: 34 },
      { damage: 5, cooldown: -0.09, count: 0.4 },
      [3, 6],
    ),
    evolve: { passive: 'area', passiveLevel: 3, into: 'thunderLoop' },
  },
  orbit: {
    id: 'orbit', name: '环绕飞刃', kind: 'orbit', ...A('blade'), maxLevel: 8,
    desc: '刀刃环绕自身旋转，碰到即伤。',
    growth: mk(
      { damage: 10, count: 2, radius: 82, spin: 2.1, knock: 70, hitCd: 0.4 },
      { damage: 2.4, radius: 6, spin: 0.16, count: 0.34 },
      [4, 7],
    ),
    evolve: { passive: 'area', passiveLevel: 3, into: 'bloodMoonRing' },
  },
  chain: {
    id: 'chain', name: '连锁闪电', kind: 'chain', ...A('torchCyan'), maxLevel: 8,
    desc: '击中最近的敌人并弹跳到附近的其他人身上。',
    growth: mk(
      { damage: 15, cooldown: 2.2, count: 2, jumpRange: 220, falloff: 0.82 },
      { damage: 3.5, cooldown: -0.07, count: 0.35 },
      [3, 5, 7],
    ),
    evolve: { passive: 'cooldown', passiveLevel: 3, into: 'thunderChain' },
  },
  // ---- evolutions ----
  thousandEdges: {
    id: 'thousandEdges', name: '千刃', kind: 'projectile', ...A('sword'), maxLevel: 1, evolved: true,
    desc: '无穷无尽的刀雨。',
    growth: mk({ damage: 13, cooldown: 0.24, count: 6, speed: 720, pierce: 2, life: 0.9, radius: 9, knock: 70 }, {}),
  },
  crescentMoon: {
    id: 'crescentMoon', name: '月牙', kind: 'arc', ...A('twinAxe'), maxLevel: 1, evolved: true,
    desc: '一斧横扫，穿透整支军团。',
    growth: mk({ damage: 46, cooldown: 1.25, count: 2, speed: 400, pierce: 40, life: 2.1, radius: 34, knock: 220 }, {}),
  },
  holyWand: {
    id: 'holyWand', name: '神圣之锤', kind: 'homing', ...A('hammerGold'), maxLevel: 1, evolved: true,
    desc: '连发的追踪巨锤。',
    growth: mk({ damage: 16, cooldown: 0.2, count: 2, speed: 520, pierce: 1, life: 1.8, radius: 9, knock: 50 }, {}),
  },
  soulEater: {
    id: 'soulEater', name: '噬魂', kind: 'aura', ...A('cauldron'), maxLevel: 1, evolved: true,
    desc: '光环不断膨胀，吞噬靠近的一切。',
    growth: mk({ damage: 18, cooldown: 0.17, radius: 96, knock: 200, grow: 26 }, {}),
  },
  laBorra: {
    id: 'laBorra', name: '圣泉', kind: 'pool', ...A('vialBlue'), maxLevel: 1, evolved: true,
    desc: '霜瓶长燃不熄。',
    growth: mk({ damage: 26, cooldown: 2.1, count: 3, speed: 210, life: 11, radius: 84, tick: 0.28 }, {}),
  },
  thunderLoop: {
    id: 'thunderLoop', name: '雷霆回环', kind: 'strike', ...A('slash'), maxLevel: 1, evolved: true,
    desc: '双重雷瀑，无休无止。',
    growth: mk({ damage: 52, cooldown: 1.35, count: 5, radius: 46, doubleCast: 2 }, {}),
  },
  bloodMoonRing: {
    id: 'bloodMoonRing', name: '血月环刃', kind: 'orbit', ...A('sword'), maxLevel: 1, evolved: true,
    desc: '赤色刀轮永不停歇。',
    growth: mk({ damage: 26, count: 5, radius: 118, spin: 2.9, knock: 150, hitCd: 0.3 }, {}),
  },
  thunderChain: {
    id: 'thunderChain', name: '永动雷链', kind: 'chain', ...A('torchCyan'), maxLevel: 1, evolved: true,
    desc: '雷链在尸群中无限弹跳。',
    growth: mk({ damage: 34, cooldown: 1.1, count: 6, jumpRange: 280, falloff: 0.92 }, {}),
  },
};

export const STARTER = 'knife';

export function weaponStats(id, level) {
  const w = WEAPONS[id];
  const { base, delta, countAt } = w.growth;
  const s = { ...base };
  const k = Math.max(0, level - 1);
  for (const key of Object.keys(delta)) {
    s[key] = (s[key] || 0) + delta[key] * k;
  }
  for (const c of countAt || []) if (level >= c) s.count = (s.count || 1) + 1;
  s.cooldown = Math.max(0.06, s.cooldown);
  s.pierce = Math.round(s.pierce ?? 0);
  s.count = Math.max(1, Math.round(s.count ?? 1));
  s.damage = Math.round(s.damage * 10) / 10;
  return s;
}

export const PASSIVES = {
  might: { id: 'might', name: '力量', ...A('might'), maxLevel: 5, step: 0.12, desc: '所有伤害 +12%' },
  armor: { id: 'armor', name: '装甲', ...A('armor'), maxLevel: 5, step: 0.09, desc: '受到的伤害 -9%' },
  swift: { id: 'swift', name: '疾行', ...A('swift'), maxLevel: 5, step: 0.09, desc: '移动速度 +9%' },
  cooldown: { id: 'cooldown', name: '冷却', ...A('cooldown'), maxLevel: 5, step: 0.08, desc: '武器冷却 -8%' },
  area: { id: 'area', name: '范围', ...A('area'), maxLevel: 5, step: 0.11, desc: '攻击范围 +11%' },
  amount: { id: 'amount', name: '数量', ...A('amount'), maxLevel: 5, step: 1, desc: '武器弹体 +1' },
  magnet: { id: 'magnet', name: '磁力', ...A('magnet'), maxLevel: 5, step: 0.3, desc: '拾取范围 +30%' },
  duration: { id: 'duration', name: '持续', ...A('duration'), maxLevel: 5, step: 0.15, desc: '持续时间 +15%' },
  growth: { id: 'growth', name: '成长', ...A('growth'), maxLevel: 5, step: 0.15, desc: '经验获取 +15%' },
};
