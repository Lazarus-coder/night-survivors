import Phaser from 'phaser';
import { VIEW, RUN, PLAYER, WEAPON_SLOTS, PASSIVE_SLOTS, xpToNext, DROPS, SPAWN } from '../data/config.js';
import { EnemySpawner } from '../systems/EnemySpawner.js';
import { PASSIVES } from '../data/weapons.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { rollChoices, rollChestChoice } from '../systems/UpgradeSystem.js';
import { audio } from '../systems/AudioSystem.js';
import { loadSave } from '../systems/SaveSystem.js';
import { SPRITES } from '../data/sprites.js';

const ENTITY_SCALE = 2.3;

export const CHARACTERS = {
  hero: { id: 'hero', name: '幸存者', ...SPRITES.hero, hp: 130, speed: 205, starter: 'knife', startLevel: 1, desc: '血厚，从飞刀起步' },
  mage: { id: 'mage', name: '法师', ...SPRITES.mage, hp: 108, speed: 198, starter: 'holyWater', startLevel: 2, desc: '初始冰霜瓶 Lv2，冷却更短' },
  rogue: { id: 'rogue', name: '盗贼', ...SPRITES.bandit, hp: 112, speed: 224, starter: 'orbit', startLevel: 1, desc: '身法快，初始环绕飞刃' },
};

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.charId = data.char || 'hero';
    this.char = CHARACTERS[this.charId];
    this.save = loadSave();
    this.meta = this.save.meta || {};
    this.magnetMul = this.meta.scavenger ? 1.4 : 1;
    this.unlockedWeapons = this.save.unlocked.weapons.includes('garlic')
      ? ['knife', 'axe', 'wand', 'holyWater', 'lightning', 'garlic']
      : ['knife', 'axe', 'wand', 'holyWater', 'lightning'];
    this.weaponSlots = WEAPON_SLOTS;
    this.passiveSlots = PASSIVE_SLOTS;
  }

  create() {
    this.audio = audio;
    audio.bindScene(this);
    this.runSeconds = 0;
    this.kills = 0;
    this.coins = 0;
    this.level = 1;
    this.xp = 0;
    this.hp = this.char.hp + (this.meta.trained ? 15 : 0);
    this.maxHp = this.hp;
    this.pendingLevels = 0;
    this.modalOpen = false;
    this.over = false;
    this.curse = 0;
    this.iframeUntil = 0;
    this.facing = new Phaser.Math.Vector2(1, 0);
    this.dashCd = 0;
    this.dashing = 0;
    this.hudAccum = 0;

    const floorKey = this.textures.exists('tile_floor') ? 'tile_floor' : 'tile_grass';
    const propsKey = this.textures.exists('tile_props_art') ? 'tile_props_art' : 'tile_props';
    this.ground = this.add.tileSprite(0, 0, VIEW.w * 1.6, VIEW.h * 1.6, floorKey).setDepth(0).setOrigin(0.5).setTint(0x474d6b);
    this.props = this.add.tileSprite(0, 0, VIEW.w * 1.6, VIEW.h * 1.6, propsKey).setDepth(0.5).setOrigin(0.5).setScale(1.5).setTint(0x7d86a8).setAlpha(0.75);

    this.player = this.physics.add.sprite(0, 0, this.char.tex, this.char.frame).setDepth(3);
    if (this.char.tint) this.player.setTint(this.char.tint);
    this.player.setScale(ENTITY_SCALE * 1.15);
    this.player.body.setSize(this.player.width / this.player.scaleX * 0.6, this.player.height / this.player.scaleY * 0.5, true);
    this.player.body.setCollideWorldBounds(false);
    this.player.setDragCap?.(0);

    this.shadow = this.add.image(0, 0, 'fx_shadow').setDepth(1.4).setScale(1.4, 0.6).setAlpha(0.35);

    this.enemies = new EnemySpawner(this);
    this.weapons = new WeaponSystem(this);
    this.weapons.add(this.char.starter);
    if (this.char.startLevel > 1) this.weapons.levelUp(this.char.starter);
    if (this.meta.weaponMaster) this.weapons.levelUp(this.char.starter);

    this.gems = this.add.group();
    this.pickups = this.add.group();
    this.ebullets = this.physics.add.group();

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,ESC');
    this.dashRequested = false;
    this.input.keyboard.on('keydown-SPACE', () => { this.dashRequested = true; });

    this.physics.add.overlap(this.player, this.enemies.group, (_p, e) => this.touchDamage(e));
    this.physics.add.overlap(this.player, this.ebullets, (_p, b) => this.hitPlayer(b.bulletDmg, b));
    this.events.on('enemy-killed', (enemy, def) => this.onKill(enemy, def));
    this.events.on('elite-spawn', (e) => this.announce(`${e.def.name} 出现了！`, 0xffb066));
    this.events.on('boss-spawn', () => {
      this.announce('死神降临 —— 撑住 40 秒！', 0xff6b8a);
      audio.play('boss');
      this.cameras.main.shake(500, 0.008);
      this.switchToBossMusic();
    });

    this.cameras.main.startFollow(this.player, false, 0.16, 0.16);
    this.cameras.main.setDeadzone(120, 90);
    if (this.cameras.main.postFX) {
      this.cameras.main.postFX.addVignette(0.5, 0.5, 0.72, 0.55);
    }
    this.physics.world.setBounds(-40000, -40000, 80000, 80000);

    this.scene.launch('Hud');
    if (this.cache.audio.exists('music_night')) {
      this.music = this.sound.add('music_night', { loop: true, volume: 0.22 });
      this.music.play();
    }
    this.events.once('shutdown', () => {
      if (this.music) this.music.stop();
      audio.scene = null;
    });
    this.pushHud();
    if (typeof window !== 'undefined') window.__ns = this;
  }

  debugSetTime(seconds) {
    this.runSeconds = seconds;
  }

  debugOpenModal() {
    this.pendingLevels = 1;
  }

  // Exercises every weapon behaviour + all passives in one go (systems smoke test).
  debugGrantAll() {
    const prev = this.weaponSlots;
    this.weaponSlots = 12;
    for (const id of ['knife', 'axe', 'wand', 'holyWater', 'garlic', 'lightning', 'orbit', 'chain']) {
      this.weapons.add(id);
      while (this.weapons.levelUp(id)) { /* push to max level */ }
    }
    for (const id of Object.keys(PASSIVES)) this.weapons.addPassive(id);
    this.weaponSlots = prev;
  }

  // ------------------------------------------------------------------ update
  update(time, delta) {
    const dt = delta / 1000;
    this.runSeconds += dt;
    if (this.dashCd > 0) this.dashCd -= dt;

    this.movePlayer(dt);
    this.updateGround();
    this.enemies.update(time, delta, this.runSeconds);
    this.enemies.step(delta);
    this.weapons.update(time, delta);
    this.stepGems(dt);
    this.stepPickups(dt);
    this.shadow.setPosition(this.player.x, this.player.y + this.player.height * 0.42);

    if (this.dashing <= 0) {
      this.player.setAlpha(time < this.iframeUntil ? (time % 160 < 80 ? 0.45 : 1) : 1);
    }

    this.hudAccum += delta;
    if (this.hudAccum > 90) { this.hudAccum = 0; this.pushHud(); }

    if (this.pendingLevels > 0 && !this.modalOpen) this.openLevelUp();

    if (this.runSeconds >= RUN.victoryAt && !this.over) this.finish(true);
    if (!this.warnedDeath && this.runSeconds > RUN.deathSpawnAt - 4) {
      this.warnedDeath = true;
      this.announce('有什么东西来了……', 0xff9bb0);
    }
  }

  movePlayer(dt) {
    const k = this.keys;
    let ix = 0;
    let iy = 0;
    if (k.A.isDown || k.LEFT.isDown) ix -= 1;
    if (k.D.isDown || k.RIGHT.isDown) ix += 1;
    if (k.W.isDown || k.UP.isDown) iy -= 1;
    if (k.S.isDown || k.DOWN.isDown) iy += 1;
    const moving = ix !== 0 || iy !== 0;

    if (moving) this.facing = new Phaser.Math.Vector2(ix, iy).normalize();

    if (this.dashing > 0) {
      this.dashing -= dt * 1000;
      this.player.setAlpha(0.55);
      if (this.dashing <= 0) this.player.setAlpha(this.time.now < this.iframeUntil ? 0.8 : 1);
      return;
    }

    if (this.dashRequested) {
      this.dashRequested = false;
      if (this.dashCd <= 0 && moving) {
        this.dashing = 150;
        this.dashCd = 3.2;
        this.iframeUntil = this.time.now + 240;
        this.player.setVelocity(this.facing.x * 680, this.facing.y * 680);
        this.spawnFx('fx_dot', this.player.x, this.player.y, { life: 200, tint: 0xbfe8ff, scale: 0.9 });
        audio.play('ui');
        return;
      }
    }

    const speed = PLAYER.speed * (1 + 0.09 * this.weapons.lvl('swift'));
    this.player.setVelocity(moving ? this.facing.x * speed : 0, moving ? this.facing.y * speed : 0);
    this.walkPhase = (this.walkPhase || 0) + (moving ? dt * 11 : 0);
    const bob = moving ? Math.sin(this.walkPhase) * 0.06 : 0;
    const base = ENTITY_SCALE * 1.15;
    this.player.setScale(base, base * (1 + bob));
    if (moving) this.player.setFlipX(this.facing.x < -0.1);
  }

  updateGround() {
    const cam = this.cameras.main;
    const x = Math.round(cam.midPoint.x);
    const y = Math.round(cam.midPoint.y);
    this.ground.setPosition(x, y);
    this.ground.setTilePosition(cam.scrollX, cam.scrollY);
    this.props.setPosition(x, y);
    this.props.setTilePosition(cam.scrollX, cam.scrollY);
  }

  // ------------------------------------------------------------------ damage
  touchDamage(enemy) {
    if (!enemy.active || !enemy.def) return;
    this.hitPlayer(enemy.dmgValue, enemy);
    // small push so the horde does not stack on the player
    const a = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
    this.enemies.damage(enemy, 0, Math.cos(a) * 90, Math.sin(a) * 90);
  }

  hitPlayer(raw, src) {
    void src;
    if (this.over || this.modalOpen) return;
    if (this.time.now < this.iframeUntil) return;
    const reduction = 0.09 * this.weapons.lvl('armor');
    const dmg = Math.max(1, Math.round(raw * (1 - reduction)));
    this.hp -= dmg;
    this.iframeUntil = this.time.now + PLAYER.iframesMs;
    this.player.setTint(0xff8080);
    this.time.delayedCall(120, () => this.player.active && this.player.clearTint());
    this.cameras.main.shake(90, 0.006);
    audio.play('hurt');
    if (this.hp <= 0) this.finish(false);
    this.pushHud();
  }

  heal(v) {
    this.hp = Math.min(this.maxHp, this.hp + v);
    this.spawnFx(SPRITES.potion, this.player.x, this.player.y - 20, { life: 420, rise: 30 });
    this.pushHud();
  }

  addCoins(v) { this.coins += v; this.pushHud(); }

  addCurse() {
    this.curse = Math.min(SPAWN.maxCurse, (this.curse || 0) + 1);
    this.announce(`诅咒加深 Lv${this.curse} —— 敌人更多，经验更快`, 0xff6b8a);
    audio.play('boss', { gap: 400, volume: 0.35 });
    this.cameras.main.shake(220, 0.004);
    this.pushHud();
  }

  // ------------------------------------------------------------------ drops
  onHit(amount, enemy) {
    void enemy;
    if (amount > 0) audio.play('hit', { gap: 55 });
  }

  onKill(enemy, def) {
    if (!def) return;
    if (enemy._counted) return;
    enemy._counted = true;
    this.kills += 1;
    audio.play('kill', { gap: 55 });
    const xpValue = Math.max(1, Math.round(
      def.xp * (1 + 0.15 * this.weapons.lvl('growth') + SPAWN.curseXp * (this.curse || 0)),
    ));
    this.dropGem(enemy.x, enemy.y, xpValue);
    if (def.behavior === 'split' && def.id !== 'bloblet') {
      for (let i = 0; i < 2; i++) {
        this.enemies.spawn('bloblet', enemy.x + (Math.random() - 0.5) * 34, enemy.y + (Math.random() - 0.5) * 34);
      }
    }
    if (def.coins > 0 && Math.random() < 0.35) this.dropCoin(enemy.x + 8, enemy.y + 6);
    if (Math.random() < DROPS.foodChance) this.dropFood(enemy.x - 10, enemy.y - 4);
    if (def.elite) {
      this.dropChest(enemy.x, enemy.y);
      this.heal(DROPS.eliteHeal);
      for (let i = 0; i < 6; i++) this.dropCoin(enemy.x + (Math.random() - 0.5) * 70, enemy.y + (Math.random() - 0.5) * 70);
      this.cameras.main.shake(160, 0.005);
    }
    this.spawnFx(SPRITES.slash, enemy.x, enemy.y, { life: 200, tint: 0xffd6a8, scale: 1.6, rotate: true });
  }

  dropGem(x, y, value) {
    if (this.gems.countActive(true) >= RUN.maxGems) {
      const first = this.gems.getChildren().find((g) => g.active);
      if (first) { first.value += value; }
      else return;
      return;
    }
    const gem = this.add.image(x, y, SPRITES.gem.tex, value >= 5 ? SPRITES.gemBig.frame : SPRITES.gem.frame)
      .setDepth(1.8).setScale(value >= 5 ? 2.4 : 1.9);
    gem.value = value;
    gem.vx = (Math.random() - 0.5) * 40;
    gem.vy = (Math.random() - 0.5) * 40;
    this.gems.add(gem);
  }

  dropCoin(x, y) {
    const c = this.add.image(x, y, SPRITES.coin.tex, SPRITES.coin.frame).setDepth(1.8).setScale(1.8);
    c.pickupKind = 'coin';
    c.value = 1;
    c.vx = (Math.random() - 0.5) * 90;
    c.vy = (Math.random() - 0.5) * 90;
    this.pickups.add(c);
  }

  dropChest(x, y) {
    const c = this.add.image(x, y, SPRITES.chest.tex, SPRITES.chest.frame).setDepth(1.8).setScale(2.2);
    c.pickupKind = 'chest';
    this.pickups.add(c);
    this.tweens.add({ targets: c, y: y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  dropFood(x, y) {
    const f = this.add.image(x, y, SPRITES.potion.tex, SPRITES.potion.frame).setDepth(1.8).setScale(1.8);
    f.pickupKind = 'food';
    f.vx = (Math.random() - 0.5) * 70;
    f.vy = (Math.random() - 0.5) * 70;
    this.pickups.add(f);
  }

  stepGems(dt) {
    const magnet = PLAYER.magnetRadius * this.magnetMul * (1 + 0.3 * this.weapons.lvl('magnet'));
    for (const gem of this.gems.getChildren()) {
      if (!gem.active) continue;
      const d = Phaser.Math.Distance.Between(gem.x, gem.y, this.player.x, this.player.y);
      if (d < PLAYER.pickupRadius) {
        this.gainXp(gem.value);
        gem.destroy();
        audio.play('pickup', { gap: 45 });
        continue;
      }
      if (d < magnet) {
        const a = Math.atan2(this.player.y - gem.y, this.player.x - gem.x);
        const pull = 320 * (1 - d / magnet) + 60;
        gem.x += Math.cos(a) * pull * dt;
        gem.y += Math.sin(a) * pull * dt;
      } else {
        gem.x += gem.vx * dt;
        gem.y += gem.vy * dt;
        gem.vx *= 0.94;
        gem.vy *= 0.94;
      }
    }
  }

  stepPickups(dt) {
    const magnet = PLAYER.magnetRadius * 1.4 * this.magnetMul * (1 + 0.3 * this.weapons.lvl('magnet'));
    for (const p of this.pickups.getChildren()) {
      if (!p.active) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y);
      if (d < PLAYER.pickupRadius + 8) {
        this.collect(p);
        continue;
      }
      if (d < magnet && p.pickupKind !== 'chest') {
        const a = Math.atan2(this.player.y - p.y, this.player.x - p.x);
        p.x += Math.cos(a) * 300 * dt;
        p.y += Math.sin(a) * 300 * dt;
      } else if (p.vx) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
    }
  }

  collect(p) {
    if (p.pickupKind === 'coin') {
      this.coins += 1;
      audio.play('coin', { gap: 45 });
    } else if (p.pickupKind === 'food') {
      this.heal(DROPS.foodHeal);
      audio.play('pickup', { gap: 60 });
    } else if (p.pickupKind === 'chest') {
      this.tweens.killTweensOf(p);
      this.spawnFx(SPRITES.chestOpen, p.x, p.y, { life: 420, scale: 2.4 });
      this.spawnFx('fx_dot', p.x, p.y, { life: 260, tint: 0xffe873, scale: 2 });
      audio.play('levelup');
      this.openLevelUp(rollChestChoice(this), '宝箱');
    }
    p.destroy();
    this.pushHud();
  }

  // ------------------------------------------------------------------ xp / levels
  gainXp(v) {
    this.xp += v;
    let need = xpToNext(this.level);
    while (this.xp >= need) {
      this.xp -= need;
      this.level += 1;
      this.pendingLevels += 1;
      need = xpToNext(this.level);
    }
  }

  openLevelUp(forcedCard, label) {
    this.modalOpen = true;
    const isChest = label === '宝箱';
    const choices = forcedCard ? [forcedCard] : rollChoices(this);
    const title = isChest ? '开启宝箱' : `升级！选择一项（Lv ${this.level}）`;
    this.scene.pause();
    this.scene.launch('Upgrade', {
      choices, title, chest: isChest,
      game: this,
      onClose: () => {
        this.modalOpen = false;
        if (!isChest) this.pendingLevels -= 1;
      },
    });
  }

  // ------------------------------------------------------------------ fx / hud
  spawnFx(art, x, y, o = {}) {
    const a = typeof art === 'string' ? { tex: art } : art;
    const img = this.add.image(x, y, a.tex, a.frame).setDepth(o.depth ?? 5).setScale(o.scale ?? 1);
    if (o.tint) img.setTint(o.tint);
    if (o.rotate) img.setRotation(Math.random() * Math.PI * 2);
    const life = o.life ?? 220;
    this.tweens.add({
      targets: img,
      alpha: 0,
      scaleY: img.scaleY * 0.6,
      scaleX: img.scaleX * 1.25,
      rotation: o.rotate ? img.rotation + 1.2 : img.rotation,
      y: y - (o.rise ?? 0),
      duration: life,
      onComplete: () => img.destroy(),
    });
    return img;
  }

  spawnEnemyBullet(from, target, dmg) {
    const b = this.ebullets.get(from.x, from.y, 'fx_dot') || this.physics.add.sprite(from.x, from.y, 'fx_dot');
    this.ebullets.add(b);
    b.setActive(true).setVisible(true);
    b.setDisplaySize(16, 16);
    b.setTint(0xff7a7a);
    b.setDepth(4);
    b.bulletDmg = dmg;
    b.body.enable = true;
    b.body.setSize(12, 12, true);
    const a = Math.atan2(target.y - from.y, target.x - from.x);
    b.setVelocity(Math.cos(a) * 260, Math.sin(a) * 260);
    this.time.delayedCall(3200, () => { if (b.active) { b.setActive(false); b.body.enable = false; } });
  }

  announce(text, color) {
    this.game.events.emit('announce', { text, color });
  }

  switchToBossMusic() {
    if (!this.cache.audio.exists('music_boss')) return;
    if (this.music) this.music.stop();
    this.music = this.sound.add('music_boss', { loop: true, volume: 0.3 });
    this.music.play();
  }

  pushHud() {
    this.game.events.emit('hud', {
      hp: this.hp, maxHp: this.maxHp,
      xp: this.xp, xpNeed: xpToNext(this.level), level: this.level,
      time: this.runSeconds, kills: this.kills, coins: this.coins,
      enemies: this.enemies.aliveCount,
      curse: this.curse || 0,
      weapons: this.weapons.snapshot(),
      passives: this.weapons.passiveSnapshot(),
      dashCd: Math.max(0, this.dashCd),
      fps: this.game.loop.actualFps,
    });
  }

  finish(victory) {
    if (this.over) return;
    this.over = true;
    this.modalOpen = true;
    audio.play(victory ? 'evolve' : 'death');
    const result = {
      victory,
      charId: this.charId,
      curse: this.curse || 0,
      time: this.runSeconds,
      kills: this.kills,
      level: this.level,
      coins: this.coins,
      weapons: this.weapons.snapshot().map((w) => w.name + (w.evolved ? '（进化）' : ` Lv${w.level}`)),
      score: Math.round(this.kills * 10 + this.level * 60 + this.runSeconds * 2 + this.coins * 3 + (victory ? 5000 : 0)),
      char: this.char.name,
    };
    this.scene.pause();
    this.scene.launch('GameOver', { ...result, char: this.char.name, muted: audio.muted });
  }
}
