import { SaveKey } from '../data/config.js';

const EMPTY = {
  runs: 0,
  bestTime: 0,
  bestKills: 0,
  bestLevel: 1,
  gold: 0,
  unlocked: { characters: ['hero'], weapons: ['knife'] },
  meta: { trained: false, weaponMaster: false, scavenger: false },
};

// Permanent upgrades bought with gold earned across runs.
export const SHOP_ITEMS = [
  { id: 'trained', name: '训练有素', cost: 300, desc: '初始生命 +15' },
  { id: 'weaponMaster', name: '武器大师', cost: 500, desc: '初始武器等级 +1' },
  { id: 'scavenger', name: '拾荒者', cost: 400, desc: '拾取范围 +40%' },
];

export function buyMeta(id) {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  const save = loadSave();
  if (!item) return { ok: false, reason: 'unknown' };
  if (save.meta[item.id]) return { ok: false, reason: 'owned' };
  if (save.gold < item.cost) return { ok: false, reason: 'gold' };
  save.gold -= item.cost;
  save.meta[item.id] = true;
  writeSave(save);
  return { ok: true, save };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SaveKey);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(EMPTY),
      ...parsed,
      unlocked: { ...EMPTY.unlocked, ...(parsed.unlocked || {}) },
      meta: { ...EMPTY.meta, ...(parsed.meta || {}) },
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(SaveKey, JSON.stringify(data));
  } catch {
    /* storage disabled — runs stay in-memory */
  }
}

export function recordRun(result) {
  const save = loadSave();
  save.runs += 1;
  save.gold += result.coins;
  save.bestTime = Math.max(save.bestTime, result.time);
  save.bestKills = Math.max(save.bestKills, result.kills);
  save.bestLevel = Math.max(save.bestLevel, result.level);
  if (result.time >= 300 && !save.unlocked.characters.includes('mage')) {
    save.unlocked.characters.push('mage');
    result.unlocked = '解锁新角色：法师（初始武器换成冰霜瓶）';
  }
  if (result.time >= 480 && !save.unlocked.characters.includes('rogue')) {
    save.unlocked.characters.push('rogue');
    result.unlocked = `${result.unlocked ? result.unlocked + ' / ' : ''}解锁新角色：盗贼（初始环绕飞刃）`;
  }
  if (result.kills >= 500 && !save.unlocked.weapons.includes('garlic')) {
    save.unlocked.weapons.push('garlic');
    result.unlocked = (result.unlocked ? result.unlocked + ' / ' : '') + '大蒜光环进入升级卡池';
  }
  writeSave(save);
  return save;
}

export function resetSave() {
  writeSave(structuredClone(EMPTY));
}
