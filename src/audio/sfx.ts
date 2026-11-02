// Effets sonores 100 % originaux, synthétisés en direct avec Web Audio (aucun fichier, aucune licence tierce).
import { Save } from '../save';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let ambienceNodes: { stop: () => void } | null = null;
let birdTimer: number | undefined;

function ac(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** À appeler lors d'un geste utilisateur (exigence iOS / Chrome). */
export function unlockAudio() {
  const c = ac();
  if (c && c.state === 'suspended') c.resume().catch(() => undefined);
  syncAmbience();
}

const on = () => Save.settings().sound;

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slideTo?: number; attack?: number } = {}) {
  const c = ac();
  if (!c || !master || !on()) return;
  const t0 = c.currentTime + (opts.at ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
  const v = opts.vol ?? 0.2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + (opts.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur: number, opts: { freq?: number; q?: number; vol?: number; at?: number; type?: BiquadFilterType; sweepTo?: number } = {}) {
  const c = ac();
  if (!c || !master || !noiseBuf || !on()) return;
  const t0 = c.currentTime + (opts.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = opts.type ?? 'bandpass';
  f.frequency.setValueAtTime(opts.freq ?? 1200, t0);
  if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + dur);
  f.Q.value = opts.q ?? 1;
  const g = c.createGain();
  const v = opts.vol ?? 0.2;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.05);
}

let stepAlt = false;
export const Sfx = {
  step() {
    stepAlt = !stepAlt;
    noise(0.07, { freq: stepAlt ? 900 : 760, q: 2, vol: 0.12, type: 'bandpass' });
    tone(stepAlt ? 190 : 170, 0.06, { vol: 0.05, type: 'triangle' });
  },
  grow() {
    // bruissement végétal + petit « pop »
    noise(0.32, { freq: 2600, q: 0.9, vol: 0.07, sweepTo: 5200, type: 'bandpass' });
    tone(520, 0.12, { type: 'sine', vol: 0.06, slideTo: 880, at: 0.05 });
  },
  pickup() {
    tone(880, 0.14, { type: 'triangle', vol: 0.16 });
    tone(1320, 0.22, { type: 'sine', vol: 0.14, at: 0.08 });
  },
  quack() {
    tone(420, 0.09, { type: 'square', vol: 0.05, slideTo: 300 });
    tone(460, 0.09, { type: 'square', vol: 0.04, slideTo: 320, at: 0.12 });
  },
  switch() {
    tone(160, 0.12, { type: 'triangle', vol: 0.18, slideTo: 90 });
    tone(660, 0.3, { type: 'sine', vol: 0.1, at: 0.06, slideTo: 990 });
  },
  plank(i: number) {
    tone(220 + i * 30, 0.08, { type: 'triangle', vol: 0.14 });
    noise(0.05, { freq: 1500, q: 3, vol: 0.08 });
  },
  magic() {
    [0, 4, 7, 12, 16].forEach((st, i) => tone(523.25 * 2 ** (st / 12), 0.5, { type: 'sine', vol: 0.09, at: i * 0.07 }));
  },
  bump() {
    tone(140, 0.12, { type: 'sine', vol: 0.14, slideTo: 100 });
  },
  stuck() {
    tone(392, 0.2, { type: 'triangle', vol: 0.1 });
    tone(330, 0.32, { type: 'triangle', vol: 0.1, at: 0.16 });
  },
  undo() {
    tone(700, 0.1, { type: 'sine', vol: 0.08, slideTo: 420 });
  },
  click() {
    tone(980, 0.05, { type: 'triangle', vol: 0.08 });
  },
  win() {
    const notes = [0, 4, 7, 12, 9, 12, 16];
    notes.forEach((st, i) => tone(392 * 2 ** (st / 12), 0.35, { type: i % 2 ? 'sine' : 'triangle', vol: 0.12, at: i * 0.1 }));
    tone(392 * 2, 0.9, { type: 'sine', vol: 0.06, at: 0.7 });
  },
  star(i: number) {
    tone(660 * 2 ** (i * 4 / 12), 0.3, { type: 'triangle', vol: 0.12 });
  },
};

// ---------- Ambiance de jardin discrète : brise + oiseaux ----------
export function syncAmbience() {
  const wanted = Save.settings().sound && Save.settings().ambience;
  if (wanted && !ambienceNodes) startAmbience();
  if (!wanted && ambienceNodes) stopAmbience();
}

function startAmbience() {
  const c = ac();
  if (!c || !master || !noiseBuf) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 420;
  const g = c.createGain();
  g.gain.value = 0.018;
  const lfo = c.createOscillator();
  const lfoG = c.createGain();
  lfo.frequency.value = 0.12;
  lfoG.gain.value = 0.01;
  lfo.connect(lfoG).connect(g.gain);
  src.connect(f).connect(g).connect(master);
  src.start();
  lfo.start();
  const chirp = () => {
    if (!on()) return;
    const base = 2200 + Math.random() * 1400;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) tone(base, 0.08, { type: 'sine', vol: 0.025, at: i * 0.11, slideTo: base * 1.25, attack: 0.02 });
  };
  const loop = () => {
    chirp();
    birdTimer = window.setTimeout(loop, 4000 + Math.random() * 7000);
  };
  birdTimer = window.setTimeout(loop, 2500);
  ambienceNodes = {
    stop() {
      try { src.stop(); lfo.stop(); } catch { /* déjà arrêté */ }
      window.clearTimeout(birdTimer);
    },
  };
}

function stopAmbience() {
  ambienceNodes?.stop();
  ambienceNodes = null;
}
