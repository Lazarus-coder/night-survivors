import Phaser from 'phaser';
import { VIEW } from '../data/config.js';
import { CHARACTERS } from './GameScene.js';
import { audio } from '../systems/AudioSystem.js';
import { loadSave, resetSave, buyMeta, SHOP_ITEMS } from '../systems/SaveSystem.js';
import { FONT } from '../data/theme.js';
import { SPRITES } from '../data/sprites.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    audio.unlock();
    this.save = loadSave();
    this.chars = Object.values(CHARACTERS).filter((c) => this.save.unlocked.characters.includes(c.id));
    this.index = 0;

    this.bg = this.add.tileSprite(0, 0, VIEW.w, VIEW.h, 'tile_grass').setOrigin(0).setAlpha(0.45);
    this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x05060d, 0.62);

    this.add.text(VIEW.w / 2, 64, 'NIGHT SURVIVORS', {
      fontFamily: FONT, fontSize: 40, color: '#ffe9a8',
    }).setOrigin(0.5);
    this.add.text(VIEW.w / 2, 112, '幸 存 者 之 夜   ·   类吸血鬼幸存者 Roguelite', {
      fontFamily: FONT, fontSize: 15, color: '#8fa3d6',
    }).setOrigin(0.5);

    // left column: character card
    this.add.rectangle(200, 150, 520, 200, 0x121626, 0.92).setOrigin(0, 0).setStrokeStyle(3, 0x59a6ff);
    this.add.text(216, 160, '◀ A / D ▶  选择角色', { fontFamily: FONT, fontSize: 11, color: '#7f8bb8' });
    this.portrait = this.add.image(286, 262, SPRITES.hero.tex, SPRITES.hero.frame).setScale(5);
    this.charName = this.add.text(378, 186, '', { fontFamily: FONT, fontSize: 22, color: '#ffffff' });
    this.charDesc = this.add.text(378, 224, '', { fontFamily: FONT, fontSize: 13, color: '#b9c4e6', lineSpacing: 6 });
    this.charWeapon = this.add.text(378, 280, '', { fontFamily: FONT, fontSize: 12, color: '#8fc4ff', lineSpacing: 6 });

    // right column: career records
    this.add.rectangle(760, 150, 320, 200, 0x121626, 0.92).setOrigin(0, 0).setStrokeStyle(2, 0x2f3a5e);
    this.add.text(780, 160, '生涯纪录', { fontFamily: FONT, fontSize: 13, color: '#ffd97a' });
    const rec = [
      ['最长存活', fmt(this.save.bestTime)],
      ['最多击杀', String(this.save.bestKills)],
      ['最高等级', `Lv ${this.save.bestLevel}`],
      ['累计局数', String(this.save.runs)],
    ];
    this.recTexts = rec.map((row, i) => {
      const y = 196 + i * 30;
      this.add.text(780, y, row[0], { fontFamily: FONT, fontSize: 13, color: '#8892b8' });
      return this.add.text(1060, y, row[1], { fontFamily: FONT, fontSize: 13, color: '#e6ecff' }).setOrigin(1, 0);
    });

    // shop: permanent upgrades for gold
    this.add.rectangle(200, 362, 880, 138, 0x121626, 0.92).setOrigin(0, 0).setStrokeStyle(2, 0x4a3f2a);
    this.shopTitle = this.add.text(216, 372, '', { fontFamily: FONT, fontSize: 13, color: '#ffd97a' });
    this.shopHint = this.add.text(1064, 372, '按 1 / 2 / 3 购买', { fontFamily: FONT, fontSize: 11, color: '#6f78a0' }).setOrigin(1, 0);
    this.shopCards = SHOP_ITEMS.map((item, i) => {
      const x = 216 + i * 286;
      const box = this.add.rectangle(x, 398, 268, 92, 0x1a1c2c, 1).setOrigin(0, 0).setStrokeStyle(2, 0x33405f);
      const key = this.add.text(x + 8, 402, `#${i + 1}`, { fontFamily: FONT, fontSize: 11, color: '#7f8bb8' });
      const name = this.add.text(x + 36, 400, item.name, { fontFamily: FONT, fontSize: 12, color: '#ffffff' });
      const cost = this.add.text(x + 260, 400, `${item.cost}G`, { fontFamily: FONT, fontSize: 12, color: '#ffd86b' }).setOrigin(1, 0);
      const desc = this.add.text(x + 8, 428, item.desc, { fontFamily: FONT, fontSize: 11, color: '#b9c4e6' });
      const state = this.add.text(x + 8, 456, '', { fontFamily: FONT, fontSize: 11, color: '#7ee0a8' });
      return { box, name, cost, desc, state, item };
    });

    this.startHint = this.add.text(VIEW.w / 2, 528, '按 SPACE / Enter 或点击开始', {
      fontFamily: FONT, fontSize: 16, color: '#fff8d8',
    }).setOrigin(0.5);
    this.tweens.add({ targets: this.startHint, alpha: 0.35, duration: 620, yoyo: true, repeat: -1 });

    this.add.text(VIEW.w / 2, 588, [
      '移动 W A S D / 方向键      冲刺 SPACE（3.2s 冷却，短暂无敌）',
      '自动攻击 · 经验宝石升级 · 精英掉宝箱 · 满级武器 + 被动 = 进化',
      '暂停 ESC        静音 M        清档 R',
    ].join('\n'), {
      fontFamily: FONT, fontSize: 11, color: '#8892b8', align: 'center', lineSpacing: 10,
    }).setOrigin(0.5);

    const notes = [];
    if (!this.save.unlocked.characters.includes('mage')) notes.push('存活 5 分钟解锁：法师');
    if (!this.save.unlocked.characters.includes('rogue')) notes.push('存活 8 分钟解锁：盗贼');
    if (!this.save.unlocked.weapons.includes('garlic')) notes.push('击杀 500 解锁：毒雾锅');
    this.add.text(VIEW.w / 2, 668, notes.length ? notes.join('   ·   ') : '全部内容已解锁', {
      fontFamily: FONT, fontSize: 10, color: '#6f78a0',
    }).setOrigin(0.5);

    this.input.on('pointerup', () => this.start());
    this.input.keyboard.on('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'enter') this.start();
      else if (k === 'a' || k === 'arrowleft') this.shift(-1);
      else if (k === 'd' || k === 'arrowright') this.shift(1);
      else if (k === '1' || k === '2' || k === '3') this.buy(Number(k) - 1);
      else if (k === 'm') { audio.setMuted(!audio.muted); }
      else if (k === 'r') { resetSave(); this.reload(); }
    });

    this.refresh();
  }

  update(time) {
    this.bg.tilePositionX = time * 0.02;
    this.bg.tilePositionY = time * 0.012;
  }

  reload() {
    this.save = loadSave();
    this.chars = Object.values(CHARACTERS).filter((c) => this.save.unlocked.characters.includes(c.id));
    this.index = 0;
    this.recTexts[3].setText(String(this.save.runs));
    this.refresh();
  }

  shift(d) {
    this.index = (this.index + d + this.chars.length) % this.chars.length;
    audio.play('ui');
    this.refresh();
  }

  buy(i) {
    const item = SHOP_ITEMS[i];
    if (!item) return;
    const res = buyMeta(item.id);
    if (res.ok) {
      audio.play('coin', { gap: 200 });
      this.save = res.save;
    } else {
      audio.play('hurt', { gap: 200, volume: 0.25 });
      this.flashHint(res.reason === 'owned' ? '已经买过了' : '金币不足');
    }
    this.refresh();
  }

  flashHint(text) {
    this.shopHint.setText(text).setColor('#ff9bb0');
    this.time.delayedCall(1200, () => this.shopHint.setText('按 1 / 2 / 3 购买').setColor('#6f78a0'));
  }

  refresh() {
    const c = this.chars[this.index];
    this.portrait.setTexture(c.tex, c.frame);
    if (c.tint) this.portrait.setTint(c.tint); else this.portrait.clearTint();
    this.charName.setText(c.name);
    this.charDesc.setText(c.desc);
    const starterName = c.starter === 'knife' ? '飞刀' : c.starter === 'holyWater' ? '冰霜瓶' : c.starter;
    this.charWeapon.setText(`初始武器：${starterName} Lv${c.startLevel + (this.save.meta.weaponMaster ? 1 : 0)}`);

    this.recTexts[0].setText(fmt(this.save.bestTime));
    this.recTexts[1].setText(String(this.save.bestKills));
    this.recTexts[2].setText(`Lv ${this.save.bestLevel}`);

    this.shopTitle.setText(`局外强化   ·   金币 ${this.save.gold}`);
    for (const card of this.shopCards) {
      const owned = this.save.meta[card.item.id];
      const afford = this.save.gold >= card.item.cost;
      card.state.setText(owned ? '已强化' : afford ? '可购买' : '金币不足');
      card.state.setColor(owned ? '#7ee0a8' : afford ? '#ffd97a' : '#7f8bb8');
      card.box.setStrokeStyle(2, owned ? 0x3f6f52 : afford ? 0x59a6ff : 0x33405f);
      card.name.setAlpha(owned ? 0.6 : 1);
      card.cost.setAlpha(owned ? 0.4 : 1);
    }
  }

  start() {
    audio.unlock();
    audio.play('levelup', { gap: 300 });
    this.scene.start('Game', { char: this.chars[this.index].id });
  }
}

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}