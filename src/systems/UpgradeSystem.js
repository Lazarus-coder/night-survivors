import { WEAPONS, PASSIVES, weaponStats } from '../data/weapons.js';
import { PASSIVE_SLOTS, SPAWN } from '../data/config.js';
import { SPRITES } from '../data/sprites.js';

function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

function weaponCard(ws, id, level) {
  const def = WEAPONS[id];
  const next = weaponStats(id, level);
  const bits = [];
  if (next.damage) bits.push(`伤害 ${next.damage}`);
  if (next.cooldown) bits.push(`冷却 ${next.cooldown.toFixed(2)}s`);
  if (next.count > 1) bits.push(`数量 ${next.count}`);
  if (next.radius) bits.push(`范围 ${Math.round(next.radius)}`);
  if (next.pierce > 1) bits.push(`穿透 ${next.pierce}`);
  return {
    kind: level === 0 ? 'weapon-new' : 'weapon-level',
    id, name: def.name, tex: def.tex, frame: def.frame, level,
    desc: level === 0 ? def.desc : bits.join(' · '),
    rarity: level === 0 ? 'rare' : 'common',
    apply: () => (level === 0 ? ws.add(id) : ws.levelUp(id)),
  };
}

function passiveCard(ws, id, level, note = '') {
  const def = PASSIVES[id];
  return {
    kind: level === 0 ? 'passive-new' : 'passive-level',
    id, name: def.name, tex: def.tex, frame: def.frame, level,
    desc: `${def.desc}（当前 ${level} → ${level + 1}）${note ? `\n${note}` : ''}`,
    rarity: level === 0 ? 'rare' : 'common',
    apply: () => ws.addPassive(id),
  };
}

// Optional risk/reward: more enemies for more experience, stacks a few times.
function curseCard(scene) {
  const next = (scene.curse || 0) + 1;
  return {
    kind: 'curse', id: 'curse', name: '诅咒契约', tex: SPRITES.death.tex, frame: SPRITES.death.frame, level: next,
    desc: `敌人 +${Math.round(SPAWN.curseRate * 100)}%，经验 +${Math.round(SPAWN.curseXp * 100)}%（诅咒 ${scene.curse || 0} → ${next}）`,
    rarity: 'rare',
    apply: () => scene.addCurse(),
  };
}

function evolveCard(ws, weaponId, intoId) {
  const def = WEAPONS[intoId];
  return {
    kind: 'evolve', id: weaponId, into: intoId, name: `进化：${def.name}`, tex: def.tex, frame: def.frame, level: 1,
    desc: `${WEAPONS[weaponId].name} 满级进化，${def.desc}`,
    rarity: 'epic',
    apply: () => ws.replace(weaponId, intoId),
  };
}

function healCard(scene) {
  return {
    kind: 'heal', id: 'heal', name: '治疗药水', tex: SPRITES.potion.tex, frame: SPRITES.potion.frame, level: 1,
    desc: '立即恢复 40 点生命', rarity: 'common',
    apply: () => scene.heal(40),
  };
}

function goldCard(scene) {
  return {
    kind: 'gold', id: 'gold', name: '财富袋', tex: SPRITES.coin.tex, frame: SPRITES.coin.frame, level: 1,
    desc: '获得 150 金币（局外结算）', rarity: 'common',
    apply: () => scene.addCoins(150),
  };
}

export function availableWeapons(unlocked) {
  return Object.keys(WEAPONS).filter((id) => !WEAPONS[id].evolved && unlocked.includes(id));
}

export function rollChoices(scene) {
  const ws = scene.weapons;
  const unlocked = scene.unlockedWeapons;
  const cards = [];

  // evolutions first — always offered when ready
  for (const w of ws.weapons) {
    const def = WEAPONS[w.id];
    if (!def.evolve || w.level < def.maxLevel) continue;
    const need = def.evolve.passiveLevel ?? 1;
    if (ws.lvl(def.evolve.passive) >= need && !ws.has(def.evolve.into)) {
      cards.push(evolveCard(ws, w.id, def.evolve.into));
    }
  }

  // passives that are one step away from unlocking an evolution get flagged
  const waitingOn = new Set();
  for (const w of ws.weapons) {
    const def = WEAPONS[w.id];
    if (!def.evolve || w.level < def.maxLevel) continue;
    const need = def.evolve.passiveLevel ?? 1;
    if (ws.lvl(def.evolve.passive) < need) waitingOn.add(def.evolve.passive);
  }

  const options = [];
  for (const w of ws.weapons) {
    const def = WEAPONS[w.id];
    if (w.level < def.maxLevel) options.push(weaponCard(ws, w.id, w.level + 1));
  }
  const freshWeapons = availableWeapons(unlocked).filter((id) => !ws.has(id));
  if (ws.count() < scene.weaponSlots && freshWeapons.length) {
    options.push(weaponCard(ws, pick(freshWeapons), 0));
  }
  for (const [id, level] of ws.passives) {
    if (level < PASSIVES[id].maxLevel) {
      options.push(passiveCard(ws, id, level, waitingOn.has(id) ? '★ 升到 Lv3 即可解锁进化' : ''));
    }
  }
  const freshPassives = Object.keys(PASSIVES).filter((id) => !ws.passives.has(id));
  if (ws.passiveSnapshot().length < PASSIVE_SLOTS && freshPassives.length) {
    const id = pick(freshPassives);
    options.push(passiveCard(ws, id, 0, waitingOn.has(id) ? '★ 升到 Lv3 即可解锁进化' : ''));
  }
  if (scene.runSeconds >= 180 && (scene.curse || 0) < SPAWN.maxCurse && Math.random() < 0.4) {
    options.push(curseCard(scene));
  }

  while (cards.length < 3 && options.length) {
    const i = (Math.random() * options.length) | 0;
    cards.push(options.splice(i, 1)[0]);
  }
  while (cards.length < 3) cards.push(Math.random() < 0.5 ? healCard(scene) : goldCard(scene));
  return cards.slice(0, 3);
}

// Chest: a free upgrade with weighted rarity (higher rarity = bigger jump)
export function rollChestChoice(scene) {
  const cards = rollChoices(scene);
  const epic = cards.find((c) => c.rarity === 'epic');
  if (epic) return epic;
  const levelUps = cards.filter((c) => c.kind === 'weapon-level' || c.kind === 'passive-level');
  return levelUps.length ? pick(levelUps) : cards[0];
}
