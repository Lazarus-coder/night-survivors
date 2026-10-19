import Phaser from 'phaser';
import { VIEW } from '../data/config.js';
import { FONT } from '../data/theme.js';
import { audio } from '../systems/AudioSystem.js';
import { rollChoices } from '../systems/UpgradeSystem.js';

const RARITY = { common: 0x8fa3d6, rare: 0x59a6ff, epic: 0xffc94d };
const RARITY_TEXT = { common: '#c8d4ff', rare: '#8fc4ff', epic: '#ffd97a' };

export default class UpgradeScene extends Phaser.Scene {
  constructor() { super('Upgrade'); }

  init(data) {
    this.data_ = data;
  }

  create() {
    const { choices, title, chest, onClose, game } = this.data_;
    this.choices = choices;
    this.onClose = onClose;
    this.gameScene = game;
    audio.unlock();

    this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x05060d, 0.78).setDepth(0);
    this.add.text(VIEW.w / 2, 92, title, {
      fontFamily: FONT, fontSize: 30, color: '#fff8d8', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);
    this.rerollsLeft = chest ? 0 : 1;
    this.hintText = this.add.text(VIEW.w / 2, 130, chest
      ? '宝箱掉落，任选其一'
      : '按 1 / 2 / 3 或鼠标点击选择   ·   R 重抽 1 次', {
      fontFamily: FONT, fontSize: 15, color: '#93a0c8',
    }).setOrigin(0.5).setDepth(2);

    this.cardW = 300;
    this.cardY = 210;
    this.gap = 34;
    const total = this.choices.length * this.cardW + (this.choices.length - 1) * this.gap;
    this.startX = VIEW.w / 2 - total / 2;
    this.layout();

    this.input.on('pointerup', (p) => {
      for (const c of this.cards) if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) this.choose(c.index);
    });
    this.input.keyboard.on('keydown', (e) => {
      if (e.key === '1' || e.key === '2' || e.key === '3') this.choose(Number(e.key) - 1);
      else if (e.key.toLowerCase() === 'r' && !chest) this.reroll();
    });
    this.events.once('shutdown', () => this.input.keyboard.removeAllListeners());
  }

  layout() {
    this.cards = this.choices.map((choice, i) => (
      this.buildCard(this.startX + i * (this.cardW + this.gap), this.cardY, this.cardW, choice, i)
    ));
  }

  buildCard(x, y, w, choice, index) {
    const h = 320;
    const c = RARITY[choice.rarity] ?? RARITY.common;
    const g = this.add.container(x, y).setDepth(3);
    const bg = this.add.rectangle(0, 0, w, h, 0x121626, 1).setOrigin(0, 0).setStrokeStyle(3, c);
    const head = this.add.rectangle(0, 0, w, 6, c).setOrigin(0, 0);
    const icon = this.add.image(w / 2, 92, choice.tex, choice.frame).setScale(5.2);
    const badge = this.add.text(14, 14, ['#1', '#2', '#3'][index], { fontFamily: FONT, fontSize: 18, color: '#7f8bb8' });
    const tag = this.add.text(w - 14, 14, { common: '常见', rare: '稀有', epic: '进化' }[choice.rarity] || '常见', {
      fontFamily: FONT, fontSize: 13, color: RARITY_TEXT[choice.rarity] || '#c8d4ff',
    }).setOrigin(1, 0);
    const name = this.add.text(w / 2, 152, choice.name, {
      fontFamily: FONT, fontSize: 22, color: '#ffffff', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5, 0);
    const lvl = choice.level > 1 ? `Lv ${choice.level}` : choice.kind === 'weapon-new' || choice.kind === 'passive-new' ? '新武器/道具' : '';
    const lvlText = this.add.text(w / 2, 184, lvl, { fontFamily: FONT, fontSize: 14, color: '#8fc4ff' }).setOrigin(0.5, 0);
    const desc = this.add.text(18, 214, wrap(choice.desc, 22), {
      fontFamily: FONT, fontSize: 14, color: '#b9c4e6', lineSpacing: 6,
    });
    g.add([bg, head, icon, badge, tag, name, lvlText, desc]);
    return { g, x, y, w, h, index, choice };
  }

  reroll() {
    const game = this.gameScene;
    if (!game || this.rerollsLeft <= 0) return;
    this.rerollsLeft -= 1;
    for (const c of this.cards) c.g.destroy();
    this.choices = rollChoices(game);
    audio.play('ui');
    this.layout();
    this.hintText.setText(this.rerollsLeft > 0 ? '按 1 / 2 / 3 或鼠标点击选择   ·   R 重抽 1 次' : '按 1 / 2 / 3 或鼠标点击选择   ·   重抽已用完');
  }

  choose(i) {
    if (i < 0 || i >= this.choices.length) return;
    const card = this.choices[i];
    audio.unlock();
    audio.play(card.rarity === 'epic' ? 'evolve' : 'ui');
    try {
      card.apply();
    } catch (err) {
      console.error('[Upgrade] apply failed', err);
    }
    if (this.onClose) this.onClose();
    this.scene.stop();
    this.scene.resume('Game');
    if (this.gameScene) this.gameScene.pushHud();
  }
}

function wrap(text, n) {
  const out = [];
  let line = '';
  for (const ch of String(text)) {
    line += ch;
    if (line.length >= n) { out.push(line); line = ''; }
  }
  if (line) out.push(line);
  return out.join('\n');
}
