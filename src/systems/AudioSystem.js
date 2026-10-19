// Sound layer: prefers real CC0 samples (Kenney Asset Pack 1, vendored under
// public/assets/audio) and falls back to a tiny WebAudio synth when a sample is
// missing, so combat always has feedback.

const PRESETS = {
  throw: { type: 'triangle', from: 520, to: 260, dur: 0.09, gain: 0.05 },
  hit: { type: 'square', from: 300, to: 160, dur: 0.05, gain: 0.035 },
  kill: { type: 'sawtooth', from: 420, to: 90, dur: 0.14, gain: 0.05 },
  hurt: { type: 'sawtooth', from: 180, to: 60, dur: 0.22, gain: 0.09 },
  pickup: { type: 'sine', from: 700, to: 1180, dur: 0.09, gain: 0.045 },
  coin: { type: 'square', from: 900, to: 1400, dur: 0.07, gain: 0.03 },
  levelup: { type: 'sine', from: 520, to: 1040, dur: 0.32, gain: 0.09, arp: [0, 0.09, 0.18] },
  evolve: { type: 'sine', from: 440, to: 1320, dur: 0.5, gain: 0.1, arp: [0, 0.1, 0.2, 0.3] },
  ui: { type: 'square', from: 640, to: 640, dur: 0.04, gain: 0.03 },
  boom: { type: 'sawtooth', from: 120, to: 40, dur: 0.35, gain: 0.09 },
  boss: { type: 'sawtooth', from: 90, to: 220, dur: 0.8, gain: 0.11 },
  death: { type: 'sine', from: 300, to: 50, dur: 1.1, gain: 0.12 },
};

const SAMPLES = {
  throw: 'sfx_laser2',
  hit: 'sfx_hit',
  kill: 'sfx_slice',
  hurt: 'sfx_tone',
  pickup: 'sfx_powerup',
  coin: 'sfx_coins',
  levelup: 'sfx_levelup',
  evolve: 'sfx_evolve',
  ui: 'sfx_click',
  boom: 'sfx_zap',
  boss: 'sfx_door',
  death: 'sfx_door',
};

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.last = new Map();
    this.scene = null;
    this.usedSamples = new Set();
  }

  /** Route through Phaser's sound manager (real samples) when a scene is bound. */
  bindScene(scene) {
    this.scene = scene;
  }

  unlock() {
    if (this.scene) {
      this.scene.sound.unlock();
      this.scene.sound.setMute(this.muted);
    }
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.7;
    if (this.scene) this.scene.sound.setMute(m);
  }

  allow(name, gapMs) {
    const now = performance.now();
    const prev = this.last.get(name) || 0;
    if (now - prev < gapMs) return false;
    this.last.set(name, now);
    return true;
  }

  play(name, opts = {}) {
    const gap = opts.gap ?? 35;
    const key = SAMPLES[name];
    if (this.scene && key && this.scene.cache.audio.exists(key)) {
      if (!this.allow(name, gap)) return;
      this.usedSamples.add(name);
      this.scene.sound.play(key, { volume: opts.volume ?? 0.45, rate: opts.rate ?? 1 });
      return;
    }
    this.playSynth(name, opts);
  }

  playSynth(name, opts = {}) {
    if (!this.ctx || this.muted) return;
    const preset = PRESETS[name];
    if (!preset) return;
    if (!this.allow(name, opts.gap ?? 35)) return;
    const now = this.ctx.currentTime;

    const steps = preset.arp || [0];
    for (const offset of steps) {
      const t = now + offset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = preset.type;
      osc.frequency.setValueAtTime(preset.from, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, preset.to), t + preset.dur);
      gain.gain.setValueAtTime(preset.gain / steps.length, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + preset.dur);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + preset.dur + 0.02);
    }
  }
}

export const audio = new AudioSystem();
