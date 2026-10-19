import Phaser from 'phaser';
import { RUN, WEAPON_SLOTS } from '../data/config.js';
import { WEAPONS, weaponStats, PASSIVES } from '../data/weapons.js';

export class WeaponSystem {
  constructor(scene) {
    this.scene = scene;
    this.weapons = [];
    this.passives = new Map();
    this.shots = scene.physics.add.group();
    this.pools = [];
    this.blades = [];
    this.orbitAngle = 0;
    this.aura = null;
    this.auraTick = 0;
    scene.physics.add.overlap(this.shots, scene.enemies.group, (s, e) => this.onShotHit(s, e), null, this);
  }

  // ---- modifiers ----
  lvl(id) { return this.passives.get(id) || 0; }
  get dmgMul() { return 1 + PASSIVES.might.step * this.lvl('might'); }
  get cdMul() { return Math.pow(0.92, this.lvl('cooldown')); }
  get areaMul() { return 1 + PASSIVES.area.step * this.lvl('area'); }
  get amountAdd() { return this.lvl('amount'); }
  get durMul() { return 1 + PASSIVES.duration.step * this.lvl('duration'); }

  add(id) {
    if (this.weapons.some((w) => w.id === id)) return false;
    if (this.weapons.length >= (this.scene.weaponSlots || WEAPON_SLOTS)) return false;
    const w = { id, level: 1, cd: 0.25 };
    this.weapons.push(w);
    if (WEAPONS[id].kind === 'aura') this.ensureAura();
    return true;
  }

  levelUp(id) {
    const w = this.weapons.find((x) => x.id === id);
    if (!w) return this.add(id);
    if (w.level < WEAPONS[id].maxLevel) { w.level += 1; return true; }
    return false;
  }

  has(id) { return this.weapons.some((w) => w.id === id); }
  count() { return this.weapons.length; }

  replace(oldId, newId) {
    const w = this.weapons.find((x) => x.id === oldId);
    if (!w) return false;
    w.id = newId;
    w.level = 1;
    w.cd = 0.2;
    if (WEAPONS[newId].kind === 'aura') this.ensureAura();
    return true;
  }

  addPassive(id) {
    const max = PASSIVES[id].maxLevel;
    const cur = this.passives.get(id) || 0;
    if (cur >= max) return false;
    this.passives.set(id, cur + 1);
    return true;
  }

  statsFor(w) {
    const def = WEAPONS[w.id];
    const s = { ...weaponStats(w.id, w.level) };
    if (s.damage != null) s.damage = Math.round(s.damage * this.dmgMul * 10) / 10;
    if (s.cooldown != null) s.cooldown = Math.max(0.05, s.cooldown * this.cdMul);
    if (s.radius != null) s.radius = s.radius * this.areaMul;
    if (s.life != null) s.life = s.life * this.durMul;
    if (def.kind !== 'aura' && s.count != null) s.count = s.count + this.amountAdd;
    return s;
  }

  update(time, delta) {
    const dt = delta / 1000;
    for (const w of this.weapons) {
      const def = WEAPONS[w.id];
      if (def.kind === 'aura' || def.kind === 'orbit') continue;
      w.cd -= dt;
      if (w.cd <= 0) {
        w.cd += this.statsFor(w).cooldown;
        this.cast(w, def, this.statsFor(w));
      }
    }
    this.stepShots(delta);
    this.stepPools(time, delta);
    this.stepAura(time, delta);
    this.stepOrbit(delta);
  }

  // ---- firing ----
  cast(w, def, s) {
    const scene = this.scene;
    const p = scene.player;
    const facing = scene.facing;
    // single-stick control: aim at the nearest threat instead of demanding manual aiming
    const aimAt = this.nearest(1)[0] || null;
    const aimAngle = aimAt ? Math.atan2(aimAt.y - p.y, aimAt.x - p.x) : Math.atan2(facing.y, facing.x);
    if (def.kind === 'projectile') {
      const n = s.count;
      for (let i = 0; i < n; i++) {
        const spread = n > 1 ? (i - (n - 1) / 2) * 0.16 : 0;
        const a = aimAngle + spread;
        const off = n > 1 ? (i - (n - 1) / 2) * 8 : 0;
        this.spawnShot(def.kind, {
          x: p.x + Math.cos(a + Math.PI / 2) * off,
          y: p.y + Math.sin(a + Math.PI / 2) * off,
          vx: Math.cos(a) * s.speed,
          vy: Math.sin(a) * s.speed,
          tex: def.tex, frame: def.frame, radius: s.radius, damage: s.damage, pierce: s.pierce,
          life: s.life, knock: s.knock, angle: a, weapon: w.id,
        });
      }
      scene.audio.play('throw', { gap: 60 });
    } else if (def.kind === 'arc') {
      const dirX = aimAt ? Math.sign(aimAt.x - p.x) || 1 : (facing.x >= 0 ? 1 : -1);
      const reach = aimAt ? Math.min(260, Math.abs(aimAt.x - p.x) * 0.7) : 90;
      for (let i = 0; i < s.count; i++) {
        this.spawnShot(def.kind, {
          x: p.x, y: p.y - 8,
          vx: dirX * (reach * 0.6 + 40 + Math.random() * 90),
          vy: -s.speed - Math.random() * 60,
          tex: def.tex, frame: def.frame, radius: s.radius, damage: s.damage, pierce: s.pierce,
          life: s.life, knock: s.knock, spin: true, weapon: w.id, gravity: 640,
        });
      }
      scene.audio.play('throw', { gap: 60 });
    } else if (def.kind === 'homing') {
      const targets = this.nearest(s.count);
      for (let i = 0; i < s.count; i++) {
        const t = targets[i % Math.max(1, targets.length)] || null;
        const a = t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.atan2(facing.y, facing.x);
        this.spawnShot(def.kind, {
          x: p.x, y: p.y - 6,
          vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
          tex: def.tex, frame: def.frame, radius: s.radius, damage: s.damage, pierce: s.pierce,
          life: s.life, knock: s.knock, target: t, weapon: w.id, homingSpeed: s.speed,
        });
      }
      scene.audio.play('throw', { gap: 55 });
    } else if (def.kind === 'pool') {
      const inView = this.inView(520);
      for (let i = 0; i < s.count; i++) {
        const t = inView.length
          ? inView[(Math.random() * inView.length) | 0]
          : { x: p.x + (Math.random() - 0.5) * 260, y: p.y + (Math.random() - 0.5) * 200 };
        this.throwFlask(p, { x: t.x + (Math.random() - 0.5) * 40, y: t.y + (Math.random() - 0.5) * 40 }, s, w.id);
      }
      scene.audio.play('throw', { gap: 90 });
    } else if (def.kind === 'strike') {
      const casts = s.doubleCast || 1;
      for (let c = 0; c < casts; c++) {
        const pool = this.inView(620);
        const n = Math.min(s.count, pool.length);
        for (let i = 0; i < n; i++) {
          const e = pool[(Math.random() * pool.length) | 0];
          const dmg = s.damage;
          this.scene.spawnFx('fx_bolt', e.x, e.y - e.height * 0.4, { depth: 6, life: 220, fade: true });
          this.scene.enemies.damage(e, dmg, 0, 0);
          this.scene.onHit(dmg, e);
          if (!e.active) this.scene.onKill(e, e.def);
        }
      }
      scene.audio.play('boom', { gap: 80 });
    } else if (def.kind === 'chain') {
      this.castChain(s, aimAt);
    }
  }

  castChain(s, first) {
    let target = first;
    if (!target) return;
    const hit = new Set();
    let dmg = s.damage;
    let from = this.scene.player;
    const range = s.jumpRange ?? 220;
    for (let i = 0; i < s.count && target; i++) {
      this.beam(from.x, from.y, target.x, target.y);
      const killed = this.scene.enemies.damage(target, Math.round(dmg), 0, 0);
      this.scene.onHit(dmg, target);
      if (killed) this.scene.onKill(target, target.def);
      hit.add(target);
      dmg *= s.falloff ?? 0.85;
      from = target;
      target = this.nextChainTarget(from, hit, range);
    }
    this.scene.audio.play('boom', { gap: 70 });
  }

  nextChainTarget(from, hit, range) {
    let best = null;
    let bestD = range;
    for (const e of this.scene.enemies.tracked) {
      if (!e.active || hit.has(e)) continue;
      const d = Phaser.Math.Distance.Between(from.x, from.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  beam(x1, y1, x2, y2) {
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    if (dist < 6) return;
    const img = this.scene.add.image((x1 + x2) / 2, (y1 + y2) / 2, 'fx_beam').setDepth(6);
    img.setDisplaySize(5, dist);
    img.setRotation(Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2);
    this.scene.tweens.add({ targets: img, alpha: 0, duration: 140, onComplete: () => img.destroy() });
  }

  spawnShot(kind, o) {
    if (this.shots.countActive(true) >= RUN.maxProjectiles) return null;
    let s = this.shots.get(o.x, o.y, o.tex, o.frame);
    if (!s) {
      s = this.scene.physics.add.sprite(o.x, o.y, o.tex, o.frame);
      this.shots.add(s);
    }
    s.setActive(true).setVisible(true);
    s.setTexture(o.tex, o.frame);
    s.setScale(1.9);
    s.kind = kind;
    s.weapon = o.weapon;
    s.damage = o.damage;
    s.pierce = o.pierce;
    s.knock = o.knock ?? 80;
    s.life = o.life ?? 1;
    s.age = 0;
    s.spin = !!o.spin;
    s.gravity = o.gravity ?? 0;
    s.homingSpeed = o.homingSpeed ?? 0;
    s.target = o.target ?? null;
    s.radiusHit = o.radius ?? 10;
    s.body.enable = true;
    s.body.setSize(s.width / s.scaleX * 0.8, s.height / s.scaleY * 0.8, true);
    s.setVelocity(o.vx, o.vy);
    s.setDepth(4);
    if (kind === 'projectile') s.rotation = o.angle;
    return s;
  }

  stepShots(delta) {
    const dt = delta / 1000;
    const p = this.scene.player;
    for (const s of this.shots.getChildren().slice()) {
      if (!s.active) continue;
      s.age += dt;
      if (s.age >= s.life) { this.despawnShot(s); continue; }
      if (s.gravity) s.setAcceleration(0, s.gravity);
      if (s.spin) s.rotation += dt * 11;
      if (s.kind === 'homing') {
        let t = s.target;
        if (!t || !t.active) {
          const near = this.nearest(1);
          t = near[0] || null;
          s.target = t;
        }
        if (t) {
          const a = Phaser.Math.Angle.RotateTo(
            Math.atan2(s.body.velocity.y, s.body.velocity.x),
            Math.atan2(t.y - s.y, t.x - s.x),
            dt * 7,
          );
          const sp = s.homingSpeed || 420;
          s.setVelocity(Math.cos(a) * sp, Math.sin(a) * sp);
        }
      }
      if (Phaser.Math.Distance.Between(s.x, s.y, p.x, p.y) > RUN.despawnRadius) this.despawnShot(s);
    }
  }

  despawnShot(s) {
    s.setActive(false).setVisible(false);
    s.body.enable = false;
    s.setVelocity(0, 0);
  }

  onShotHit(shot, enemy) {
    if (!shot.active || !enemy.active || !enemy.def) return;
    if (shot.hitOnce && shot.hitOnce.has(enemy)) return;
    if (!shot.hitOnce) shot.hitOnce = new Set();
    shot.hitOnce.add(enemy);
    const a = Math.atan2(enemy.y - shot.y, enemy.x - shot.x);
    const killed = this.scene.enemies.damage(enemy, shot.damage, Math.cos(a) * shot.knock, Math.sin(a) * shot.knock);
    this.scene.onHit(shot.damage, enemy);
    if (killed) this.scene.onKill(enemy, enemy.def);
    shot.pierce -= 1;
    if (shot.pierce < 0) {
      this.scene.spawnFx('fx_dot', shot.x, shot.y, { depth: 5, life: 130, tint: 0xfff2a8, scale: 0.5 });
      this.despawnShot(shot);
    }
  }

  // ---- lingering pools (holy water) ----
  throwFlask(from, to, s, weaponId) {
    const flask = this.scene.add.sprite(from.x, from.y, WEAPONS.holyWater.tex, WEAPONS.holyWater.frame).setDepth(5).setScale(0.9);
    const flight = 0.55 * this.durMul;
    const peak = 96;
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: flight * 1000,
      onUpdate: (tw) => {
        if (!flask.active) return;
        const t = tw.getValue();
        flask.x = from.x + (to.x - from.x) * t;
        flask.y = from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * peak;
        flask.rotation = t * 7;
      },
      onComplete: () => {
        flask.destroy();
        this.addPool(to.x, to.y, s, weaponId);
      },
    });
  }

  addPool(x, y, s, weaponId) {
    const sprite = this.scene.add.image(x, y, 'fx_pool').setDepth(1).setAlpha(0.6);
    const radius = s.radius;
    sprite.setScale(radius / (sprite.width / 2));
    this.pools.push({
      sprite, x, y, radius,
      life: s.life, tick: s.tick ?? 0.4, tickT: 0,
      damage: s.damage, weapon: weaponId,
    });
    this.scene.audio.play('boom', { gap: 100 });
  }

  stepPools(time, delta) {
    const dt = delta / 1000;
    for (let i = this.pools.length - 1; i >= 0; i--) {
      const pool = this.pools[i];
      pool.life -= dt;
      pool.tickT -= dt;
      pool.sprite.setAlpha(0.42 + Math.sin(time / 140 + i) * 0.14);
      if (pool.tickT <= 0) {
        pool.tickT = pool.tick;
        for (const e of this.scene.enemies.tracked) {
          if (!e.active) continue;
          if (Phaser.Math.Distance.Between(pool.x, pool.y, e.x, e.y) <= pool.radius + e.radiusGuess) {
            this.scene.enemies.damage(e, pool.damage, 0, -18);
            this.scene.onHit(pool.damage, e);
            if (!e.active) this.scene.onKill(e, e.def);
          }
        }
      }
      if (pool.life <= 0) {
        pool.sprite.destroy();
        this.pools.splice(i, 1);
      }
    }
  }

  // ---- garlic-style aura ----
  ensureAura() {
    if (this.aura) return;
    this.aura = this.scene.add.image(0, 0, 'fx_ring').setDepth(1).setAlpha(0.32).setBlendMode(Phaser.BlendModes.ADD);
  }

  stepAura(time, delta) {
    const w = this.weapons.find((x) => WEAPONS[x.id].kind === 'aura');
    if (!w) {
      if (this.aura) { this.aura.setVisible(false); }
      return;
    }
    const s = this.statsFor(w);
    const p = this.scene.player;
    this.ensureAura();
    let radius = s.radius;
    if (s.grow) {
      radius += Math.min(120, (this.scene.runSeconds || 0) * s.grow * 0.35);
    }
    this.aura.visible = true;
    this.aura.setPosition(p.x, p.y);
    this.aura.setScale((radius * 2) / this.aura.width);
    this.aura.setRotation(time / 900);
    this.auraTick -= delta / 1000;
    if (this.auraTick <= 0) {
      this.auraTick = s.cooldown;
      for (const e of this.scene.enemies.tracked) {
        if (!e.active) continue;
        const d = Phaser.Math.Distance.Between(p.x, p.y, e.x, e.y);
        if (d <= radius + e.radiusGuess) {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          const kb = s.knock ?? 140;
          const killed = this.scene.enemies.damage(e, s.damage, Math.cos(a) * kb, Math.sin(a) * kb);
          this.scene.onHit(s.damage, e);
          if (killed) this.scene.onKill(e, e.def);
        }
      }
    }
  }

  // ---- orbiting blades ----
  stepOrbit(delta) {
    const w = this.weapons.find((x) => WEAPONS[x.id].kind === 'orbit');
    if (!w) {
      for (const b of this.blades) b.setVisible(false);
      return;
    }
    const s = this.statsFor(w);
    const def = WEAPONS[w.id];
    const p = this.scene.player;
    const dt = delta / 1000;
    this.orbitAngle += (s.spin ?? 2) * dt;

    while (this.blades.length < s.count) {
      const b = this.scene.add.image(p.x, p.y, def.tex, def.frame).setDepth(4).setScale(1.8).setBlendMode(Phaser.BlendModes.NORMAL);
      this.blades.push(b);
    }

    for (let i = 0; i < this.blades.length; i++) {
      const b = this.blades[i];
      const active = i < s.count;
      b.setVisible(active);
      if (!active) continue;
      const a = this.orbitAngle + (i / s.count) * Math.PI * 2;
      b.x = p.x + Math.cos(a) * s.radius;
      b.y = p.y + Math.sin(a) * s.radius * 0.72;
      b.rotation = a + Math.PI / 2;
      for (const e of this.scene.enemies.tracked) {
        if (!e.active || e.orbitCd > 0) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, e.x, e.y) <= 16 + e.radiusGuess) {
          e.orbitCd = s.hitCd ?? 0.4;
          const kb = s.knock ?? 70;
          const killed = this.scene.enemies.damage(e, s.damage, Math.cos(a) * kb, Math.sin(a) * kb);
          this.scene.onHit(s.damage, e);
          if (killed) this.scene.onKill(e, e.def);
        }
      }
    }
  }

  nearest(n) {
    const p = this.scene.player;
    const list = [];
    for (const e of this.scene.enemies.tracked) {
      if (!e.active) continue;
      e._d = Phaser.Math.Distance.Squared(p.x, p.y, e.x, e.y);
      list.push(e);
    }
    list.sort((a, b) => a._d - b._d);
    return list.slice(0, Math.max(1, n));
  }

  inView(maxDist) {
    const cam = this.scene.cameras.main;
    const out = [];
    for (const e of this.scene.enemies.tracked) {
      if (!e.active) continue;
      if (e.x < cam.worldView.x - 40 || e.x > cam.worldView.right + 40) continue;
      if (e.y < cam.worldView.y - 40 || e.y > cam.worldView.bottom + 40) continue;
      if (maxDist && Phaser.Math.Distance.Between(e.x, e.y, this.scene.player.x, this.scene.player.y) > maxDist) continue;
      out.push(e);
    }
    return out;
  }

  snapshot() {
    return this.weapons.map((w) => ({
      id: w.id, level: w.level, name: WEAPONS[w.id].name, tex: WEAPONS[w.id].tex, frame: WEAPONS[w.id].frame,
      max: WEAPONS[w.id].maxLevel, evolved: !!WEAPONS[w.id].evolved,
    }));
  }

  passiveSnapshot() {
    return [...this.passives.entries()].map(([id, level]) => ({
      id, level, name: PASSIVES[id].name, tex: PASSIVES[id].tex, frame: PASSIVES[id].frame, max: PASSIVES[id].maxLevel,
    }));
  }
}
