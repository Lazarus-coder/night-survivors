import Phaser from 'phaser';
import { VIEW, PLAYER, RUN, SPAWN } from '../data/config.js';
import { FONT } from '../data/theme.js';
import { audio } from '../systems/AudioSystem.js';

export default class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  create() {
    this.paused = false;
    const w = VIEW.w;
    const s = (x, y, text, size, color, align = 'left') => this.add.text(x, y, text, {
      fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold', align,
    }).setOrigin(align === 'center' ? 0.5 : 0, 0).setDepth(10);

    // hp
    this.add.rectangle(24, 26, 236, 22, 0x000000, 0.55).setDepth(9);
    this.hpBg = this.add.rectangle(26, 28, 232, 18, 0x3a1622).setDepth(10);
    this.hpFill = this.add.rectangle(26, 28, 232, 18, 0xe0486a).setOrigin(0, 0.5).setDepth(11);
    this.hpText = s(28, 22, '', 14, '#ffe9ef');

    // level / timer / kills / coins
    this.levelText = s(24, 54, 'Lv 1', 18, '#f6e8a8');
    this.timeText = s(w / 2, 18, '00:00', 30, '#ffffff', 'center');
    this.killText = s(w - 26, 66, '0', 16, '#cfd6ff', 'right');
    this.coinText = s(w - 26, 24, '0', 16, '#ffd86b', 'right');
    s(w - 26, 52, 'KILLS', 10, '#7b80a8', 'right');
    s(w - 26, 10, 'GOLD', 10, '#7b80a8', 'right');

    // xp bar
    this.add.rectangle(24, VIEW.h - 26, w - 48, 20, 0x000000, 0.55).setDepth(9);
    this.xpBg = this.add.rectangle(26, VIEW.h - 24, w - 52, 16, 0x1d2a44).setDepth(10);
    this.xpFill = this.add.rectangle(26, VIEW.h - 24, 0, 16, 0x4fa8ff).setOrigin(0, 0.5).setDepth(11);
    this.xpText = s(30, VIEW.h - 30, '', 12, '#dcecff');

    // loadout row
    this.loadoutY = VIEW.h - 78;
    this.iconRow = this.add.container(24, this.loadoutY).setDepth(10);
    this.dashText = s(24, VIEW.h - 108, '', 12, '#9fb4d8');

    this.announceText = s(w / 2, 96, '', 20, '#ffffff', 'center').setAlpha(0);
    this.debugText = s(VIEW.w - 26, 92, '', 11, '#5f648c', 'right');

    this.game.events.on('hud', this.onHud, this);
    this.game.events.on('announce', this.onAnnounce, this);
    // event-driven so a quick tap always registers (polling JustDown can miss short presses)
    this.input.keyboard.on('keydown-ESC', () => this.tryPause());
    this.input.keyboard.on('keydown-P', () => this.tryPause());
    this.events.once('shutdown', () => {
      this.game.events.off('hud', this.onHud, this);
      this.game.events.off('announce', this.onAnnounce, this);
      this.input.keyboard.removeAllListeners();
    });

    this.cards = [];
    this.renderIcons({ weapons: [], passives: [] });
  }

  tryPause() {
    const game = this.scene.get('Game');
    if (!game || game.modalOpen || game.over) return;
    this.togglePause();
  }

  update(time) {
    for (const c of this.cards) {
      c.t += 1;
      if (c.t > c.life) { c.obj.destroy(); c.dead = true; }
    }
    this.cards = this.cards.filter((c) => !c.dead);
    void time;
  }

  togglePause() {
    this.paused = !this.paused;
    if (this.paused) {
      this.scene.pause('Game');
      this.pausePanel = this.buildPausePanel();
    } else {
      if (this.pausePanel) this.pausePanel.destroy(true);
      this.pausePanel = null;
      this.scene.resume('Game');
    }
  }

  // Full build + effective multipliers, so pausing is actually useful for planning.
  buildPausePanel() {
    const g = this.scene.get('Game');
    const d = this.lastHud || { weapons: [], passives: [] };
    const w = VIEW.w;
    const panel = this.add.container(0, 0).setDepth(20);
    const box = (x, y, ww, hh, stroke = 0x44507a) => this.add.rectangle(x, y, ww, hh, 0x0b0e18, 0.94).setOrigin(0, 0).setStrokeStyle(2, stroke);
    panel.add(this.add.rectangle(0, 0, w, VIEW.h, 0x05060d, 0.72).setOrigin(0, 0));
    panel.add(box(w / 2 - 340, 96, 680, 340, 0x59a6ff));
    panel.add(this.add.text(w / 2, 116, 'PAUSED  暂停', { fontFamily: FONT, fontSize: 20, color: '#fff8d8' }).setOrigin(0.5, 0));

    const label = (x, y, t, color = '#8892b8', size = 12) => {
      const txt = this.add.text(x, y, t, { fontFamily: FONT, fontSize: size, color });
      panel.add(txt);
      return txt;
    };
    const iconRow = (x, y, items) => {
      items.slice(0, 8).forEach((it, i) => {
        const cx = x + i * 78;
        panel.add(this.add.rectangle(cx, y, 68, 34, 0x121626, 1).setOrigin(0, 0).setStrokeStyle(1, 0x33405f));
        panel.add(this.add.image(cx + 18, y + 17, it.tex, it.frame).setScale(1.5));
        const lv = `${it.level}${it.evolved ? '★' : ''}`;
        panel.add(this.add.text(cx + 34, y + 10, lv, { fontFamily: FONT, fontSize: 10, color: it.evolved ? '#ffd447' : '#c8d4ff' }));
      });
    };

    label(w / 2 - 310, 156, `武器 ${d.weapons.length} / ${g.weaponSlots}`);
    iconRow(w / 2 - 310, 176, d.weapons);
    label(w / 2 - 310, 236, `被动 ${d.passives.length} / ${g.passiveSlots}`);
    iconRow(w / 2 - 310, 256, d.passives);

    const ws = g.weapons;
    const stats = [
      ['伤害', `×${ws.dmgMul.toFixed(2)}`],
      ['冷却', `×${ws.cdMul.toFixed(2)}`],
      ['范围', `×${ws.areaMul.toFixed(2)}`],
      ['弹体', `+${ws.amountAdd}`],
      ['持续时间', `×${ws.durMul.toFixed(2)}`],
      ['经验', `×${(1 + 0.15 * ws.lvl('growth') + SPAWN.curseXp * (g.curse || 0)).toFixed(2)}`],
      ['磁力', `${Math.round(PLAYER.magnetRadius * (g.magnetMul || 1) * (1 + 0.3 * ws.lvl('magnet')))}`],
      ['诅咒', `Lv ${g.curse || 0} / ${SPAWN.maxCurse}`],
      ['敌人', `${g.enemies.aliveCount} / ${RUN.maxEnemies}`],
      ['击杀', `${g.kills}`],
    ];
    label(w / 2 + 40, 156, '当前数值');
    stats.forEach((row, i) => {
      const col = i % 2;
      const rowIdx = (i / 2) | 0;
      const x = w / 2 + 40 + col * 150;
      const y = 182 + rowIdx * 34;
      label(x, y, row[0], '#8892b8', 11);
      label(x, y + 14, row[1], '#e6ecff', 13);
    });

    panel.add(this.add.text(w / 2, 400, 'ESC / P 继续        M 静音        R 升级界面重抽', {
      fontFamily: FONT, fontSize: 11, color: '#6f78a0',
    }).setOrigin(0.5, 0));
    return panel;
  }

  onHud(d) {
    this.lastHud = d;
    this.hpFill.width = Math.max(0, 232 * (d.hp / d.maxHp));
    this.hpText.setText(`${Math.max(0, Math.ceil(d.hp))} / ${d.maxHp}`);
    this.levelText.setText(`Lv ${d.level}`);
    this.timeText.setText(fmt(d.time));
    this.killText.setText(String(d.kills));
    this.coinText.setText(String(d.coins));
    this.xpFill.width = Math.max(0, (VIEW.w - 52) * Math.min(1, d.xp / d.xpNeed));
    this.xpText.setText(`XP ${Math.floor(d.xp)} / ${d.xpNeed}   ·   敌人 ${d.enemies}${d.curse ? `   ·   诅咒 Lv${d.curse}` : ''}`);
    this.dashText.setText(d.dashCd > 0.05 ? `冲刺 冷却 ${d.dashCd.toFixed(1)}s` : '冲刺 就绪 [SPACE]');
    this.debugText.setText(`${Math.round(d.fps)} fps${audio.muted ? '   MUTED [M]' : ''}`);
    this.renderIcons(d);
  }

  renderIcons(d) {
    const sig = d.weapons.map((w) => `${w.id}${w.level}`).join(',') + '|' + d.passives.map((p) => `${p.id}${p.level}`).join(',');
    if (sig === this.iconSig) return;
    this.iconSig = sig;
    this.iconRow.removeAll(true);
    const items = [
      ...d.weapons.map((w) => ({ ...w, color: w.evolved ? '#ffd447' : '#a8c8ff' })),
      ...d.passives.map((p) => ({ ...p, color: '#c8b4ff' })),
    ];
    items.forEach((it, i) => {
      const x = i * 46;
      const box = this.add.rectangle(x + 18, 18, 36, 36, 0x000000, 0.5).setStrokeStyle(2, it.evolved ? 0xffd447 : 0x44507a);
      const img = this.add.image(x + 18, 16, it.tex, it.frame).setScale(1.9);
      const lv = this.add.text(x + 18, 30, it.level >= it.max && !it.evolved ? 'MAX' : String(it.level), {
        fontFamily: FONT, fontSize: '10px', color: it.color, fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      this.iconRow.add([box, img, lv]);
    });
  }

  onAnnounce({ text, color }) {
    this.announceText.setText(text).setColor(`#${(color >>> 0).toString(16).padStart(6, '0')}`).setAlpha(1);
    this.tweens.add({ targets: this.announceText, alpha: 0, delay: 900, duration: 700 });
    for (let i = 0; i < 8; i++) {
      const g = this.add.circle(VIEW.w / 2 + (Math.random() - 0.5) * 260, 120 + Math.random() * 30, 3, color, 0.8).setDepth(9);
      this.cards.push({ obj: g, t: 0, life: 40 });
    }
  }
}

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
