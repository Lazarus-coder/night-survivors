import Phaser from 'phaser';
import { VIEW } from '../data/config.js';
import { audio } from '../systems/AudioSystem.js';
import { recordRun, loadSave } from '../systems/SaveSystem.js';
import { FONT } from '../data/theme.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) { this.result = data; }

  create() {
    audio.unlock();
    const r = this.result;
    const before = loadSave();
    recordRun(r);
    const save = loadSave();

    this.add.rectangle(0, 0, VIEW.w, VIEW.h, 0x05060d, 0.82);
    const panel = this.add.rectangle(VIEW.w / 2 - 300, 120, 600, 470, 0x121626, 0.96).setOrigin(0, 0).setStrokeStyle(3, r.victory ? 0xffd447 : 0xe0486a);

    this.add.text(VIEW.w / 2, 160, r.victory ? 'VICTORY  你活下来了' : 'YOU DIED  你倒下了', {
      fontFamily: FONT, fontSize: 34, color: r.victory ? '#ffe9a8' : '#ff9bb0', fontStyle: 'bold',
    }).setOrigin(0.5);

    const rows = [
      ['存活时间', fmt(r.time), record(before.bestTime, r.time)],
      ['击杀', String(r.kills), record(before.bestKills, r.kills)],
      ['等级', `Lv ${r.level}`, record(before.bestLevel, r.level)],
      ['金币', String(r.coins), ''],
      ['诅咒', r.curse ? `Lv ${r.curse}` : '无', ''],
      ['得分', String(r.score), ''],
    ];
    rows.forEach((row, i) => {
      const y = 216 + i * 32;
      this.add.text(VIEW.w / 2 - 270, y, row[0], { fontFamily: FONT, fontSize: 16, color: '#8892b8' });
      this.add.text(VIEW.w / 2 + 20, y, row[1], { fontFamily: FONT, fontSize: 18, color: '#ffffff', align: 'right' }).setOrigin(1, 0);
      if (row[2]) this.add.text(VIEW.w / 2 + 40, y, row[2], { fontFamily: FONT, fontSize: 14, color: '#ffd97a' });
    });

    this.add.text(VIEW.w / 2 - 270, 410, '本局构筑', { fontFamily: FONT, fontSize: 15, color: '#8892b8' });
    this.add.text(VIEW.w / 2 - 270, 434, r.weapons.join('   ·   ') || '（无）', {
      fontFamily: FONT, fontSize: 15, color: '#c8d4ff', lineSpacing: 6, wordWrap: { width: 540 },
    });

    if (r.unlocked) {
      this.add.text(VIEW.w / 2, 500, `★ ${r.unlocked}`, { fontFamily: FONT, fontSize: 16, color: '#7ee0a8' }).setOrigin(0.5);
    }
    this.add.text(VIEW.w / 2, 530, `累计局数 ${save.runs}   ·   总金币 ${save.gold}`, {
      fontFamily: FONT, fontSize: 13, color: '#6f78a0',
    }).setOrigin(0.5);

    this.add.text(VIEW.w / 2, 570, 'R 再来一局      SPACE / ESC 返回主菜单', {
      fontFamily: FONT, fontSize: 18, color: '#fff8d8', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(VIEW.w / 2, 620, '提示：满级武器 + 对应被动 = 进化卡；精英怪掉落宝箱。', {
      fontFamily: FONT, fontSize: 13, color: '#7f8bb8',
    }).setOrigin(0.5);
    void panel;

    this.input.keyboard.on('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'r') this.again();
      else if (k === ' ' || k === 'enter' || k === 'escape') this.toMenu();
    });
  }

  again() {
    audio.play('ui');
    this.scene.stop('Game');
    this.scene.stop('Hud');
    this.scene.start('Game', { char: this.result.charId });
  }

  toMenu() {
    audio.play('ui');
    this.scene.stop('Game');
    this.scene.stop('Hud');
    this.scene.start('Menu');
  }
}

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function record(prev, cur) {
  return cur > prev ? 'NEW 纪录' : '';
}
