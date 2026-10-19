import Phaser from 'phaser';
import { RUN, SPAWN } from '../data/config.js';
import { ENEMIES, SPAWN_ORDER, eliteForMinute, statScale } from '../data/enemies.js';

export class EnemySpawner {
  constructor(scene) {
    this.scene = scene;
    this.group = scene.physics.add.group();
    this.credit = 0;
    this.minuteFired = 0;
    this.deathSpawned = false;
    this.aliveCount = 0;
    this.tracked = new Set();
  }

  ringPoint(pad = RUN.spawnPad) {
    const cam = this.scene.cameras.main;
    const radius = Math.hypot(cam.width / 2, cam.height / 2) + pad;
    const a = Math.random() * Math.PI * 2;
    return {
      x: cam.midPoint.x + Math.cos(a) * radius,
      y: cam.midPoint.y + Math.sin(a) * radius,
    };
  }

  // smooth spawns-per-second curve; curse contracts raise it for the whole run
  spawnRate(seconds) {
    const min = seconds / 60;
    return (SPAWN.baseRate + min * SPAWN.ratePerMinute) * (1 + SPAWN.curseRate * (this.scene.curse || 0));
  }

  pickType(seconds) {
    const pool = SPAWN_ORDER.filter((id) => {
      const d = ENEMIES[id];
      return seconds >= d.from && seconds < d.to && d.weight > 0;
    });
    if (!pool.length) return 'zombie';
    let total = 0;
    for (const id of pool) total += ENEMIES[id].weight;
    let roll = Math.random() * total;
    for (const id of pool) {
      roll -= ENEMIES[id].weight;
      if (roll <= 0) return id;
    }
    return pool[pool.length - 1];
  }

  spawn(typeId, x, y, extra = {}) {
    const def = ENEMIES[typeId];
    if (this.tracked.size >= RUN.maxEnemies) {
      let far = null;
      let farD = -1;
      const p = this.scene.player;
      for (const e of this.tracked) {
        if (e.def?.elite || e.def?.boss) continue;
        const d = Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y);
        if (d > farD) { farD = d; far = e; }
      }
      if (far) {
        this.prepare(far, typeId, x, y, extra);
        return far;
      }
      return null;
    }
    let sprite = this.group.get(x, y, def.tex, def.frame);
    if (!sprite) {
      sprite = this.scene.physics.add.sprite(x, y, def.tex, def.frame);
      this.group.add(sprite);
    }
    sprite.setActive(true).setVisible(true);
    sprite.body.enable = true;
    this.tracked.add(sprite);
    this.prepare(sprite, typeId, x, y, extra);
    return sprite;
  }

  prepare(sprite, typeId, x, y, extra = {}) {
    const def = ENEMIES[typeId];
    const scale = statScale(this.scene.runSeconds || 0);
    sprite.setTexture(def.tex, def.frame);
    sprite.def = def;
    sprite.typeId = typeId;
    sprite._counted = false;
    sprite.hp = Math.round((extra.hp ?? def.hp) * scale.hp);
    sprite.maxHp = sprite.hp;
    sprite.dmgValue = def.dmg * scale.dmg;
    sprite.enemySpeed = def.speed;
    sprite.behaviorT = Math.random() * 1000;
    sprite.dashT = 0;
    sprite.dashing = 0;
    sprite.shootT = 1200 + Math.random() * 1200;
    sprite.knockX = 0;
    sprite.knockY = 0;
    sprite.flashT = 0;
    sprite.orbitCd = 0;
    sprite.alpha = def.alpha ?? 1;
    sprite.clearTint();
    if (def.tint) sprite.setTint(def.tint);
    const sc = (def.scale ?? 1) * (extra.scale ?? 1) * 2.3;
    sprite.setScale(sc);
    sprite.baseScale = sc;
    sprite.stepPhase = Math.random() * Math.PI * 2;
    sprite.setPosition(x, y);
    sprite.setDepth(2);
    sprite.radiusGuess = Math.max(9, sprite.width * 0.31);
    sprite.body.setSize(sprite.width / sc * 0.62, sprite.height / sc * 0.62, true);
    sprite.body.setMaxVelocity(560, 560);
    sprite.body.setCollideWorldBounds(false);
  }

  update(time, delta, runSeconds) {
    void time;
    this.credit += this.spawnRate(runSeconds) * (delta / 1000);
    let spawned = 0;
    while (this.credit >= 1 && spawned < 12) {
      this.credit -= 1;
      spawned += 1;
      const p = this.ringPoint();
      this.spawn(this.pickType(runSeconds), p.x, p.y);
    }

    const minute = Math.floor(runSeconds / 60);
    if (minute > this.minuteFired) {
      this.minuteFired = minute;
      const eliteId = eliteForMinute(minute);
      if (eliteId) {
        const p = this.ringPoint(30);
        const e = this.spawn(eliteId, p.x, p.y);
        if (e) this.scene.events.emit('elite-spawn', e);
      }
    }

    if (!this.deathSpawned && runSeconds >= RUN.deathSpawnAt) {
      this.deathSpawned = true;
      const ring = this.ringPoint(20);
      const d = this.spawn('death', ring.x, ring.y, { hp: 1e9 });
      if (d) this.scene.events.emit('boss-spawn', d);
    }
  }

  step(delta) {
    const player = this.scene.player;
    const dt = delta / 1000;
    let count = 0;
    const recycle = [];
    for (const e of this.tracked) {
      if (!e.active || !e.def) continue;
      count++;
      const def = e.def;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      e.behaviorT += delta;
      if (e.orbitCd > 0) e.orbitCd -= dt;

      let vx = (dx / dist) * e.enemySpeed;
      let vy = (dy / dist) * e.enemySpeed;

      if (def.behavior === 'zigzag') {
        const perp = Math.sin(e.x * 0.008 + e.behaviorT * 0.004) * 72;
        vx += (-dy / dist) * perp;
        vy += (dx / dist) * perp;
      } else if (def.behavior === 'dash') {
        e.dashT += delta;
        if (e.dashing > 0) e.dashing -= delta;
        else if (e.dashT > (def.dashInterval || 2200) && dist < 430) {
          e.dashT = 0;
          e.dashing = 600;
        }
        if (e.dashing > 0) {
          vx = (dx / dist) * def.dashSpeed;
          vy = (dy / dist) * def.dashSpeed;
        }
      } else if (def.behavior === 'shoot') {
        if (dist < 190) { vx *= -0.75; vy *= -0.75; }
      }

      // any enemy with a ranged attack fires on its own timer, whatever its movement is
      if (def.bulletDmg) {
        e.shootT -= delta;
        if (e.shootT <= 0 && dist < 540) {
          e.shootT = def.shootInterval || 2400;
          this.scene.spawnEnemyBullet(e, player, def.bulletDmg * statScale(this.scene.runSeconds).dmg);
        }
      }

      vx += e.knockX;
      vy += e.knockY;
      const decay = Math.pow(0.0022, dt);
      e.knockX *= decay;
      e.knockY *= decay;

      e.setVelocity(vx, vy);
      e.scaleY = e.baseScale * (1 + Math.sin((this.scene.time.now / 110) + e.stepPhase) * 0.07);
      e.setFlipX(vx < 0);
      if (e.flashT > 0) {
        e.flashT -= delta;
        if (e.flashT <= 0) {
          if (def.tint) e.setTint(def.tint);
          else e.clearTint();
        }
      }
      if (dist > RUN.despawnRadius) recycle.push(e);
    }
    this.aliveCount = count;
    for (const e of recycle) {
      const p = this.ringPoint(40);
      this.prepare(e, this.pickType(this.scene.runSeconds), p.x, p.y);
    }
  }

  flash(enemy, ms = 70) {
    enemy.setTint(0xffffff);
    enemy.flashT = ms;
  }

  damage(enemy, amount, kx = 0, ky = 0) {
    if (!enemy || !enemy.active || !enemy.def) return false;
    if (enemy.def.boss) {
      this.flash(enemy, 40);
      return false;
    }
    enemy.hp -= amount;
    enemy.knockX += kx;
    enemy.knockY += ky;
    this.flash(enemy);
    if (enemy.hp <= 0) {
      this.kill(enemy);
      return true;
    }
    return false;
  }

  kill(enemy) {
    if (!enemy || !enemy.active) return;
    const def = enemy.def;
    enemy.setActive(false).setVisible(false);
    enemy.body.enable = false;
    enemy.setVelocity(0, 0);
    this.tracked.delete(enemy);
    this.scene.events.emit('enemy-killed', enemy, def);
  }

  clear() {
    for (const e of this.tracked) e.destroy();
    this.tracked.clear();
  }
}