/**
 * 8-bit sounds, synthesized with the Web Audio API: square and triangle waves
 * and a little noise, like an old console. No audio files, so nothing to
 * download and nothing loaded from another site.
 *
 * Browsers only allow sound after the player has touched the page, so the
 * audio context is created on the first tap. Sound effects are on by default,
 * music is off; both are remembered in this browser.
 */

type Wave = OscillatorType;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

const KEY_SFX = "viaggio.suoni", KEY_MUSIC = "viaggio.musica";
const read = (k: string, dflt: boolean) => { try { const v = localStorage.getItem(k); return v === null ? dflt : v === "1"; } catch { return dflt; } };
const write = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? "1" : "0"); } catch { /* in memory only */ } };

let sfxOn = read(KEY_SFX, true);
let musicOn = read(KEY_MUSIC, false);
export const sfxEnabled = () => sfxOn;
export const musicEnabled = () => musicOn;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.18; // chiptunes are loud: keep it gentle
  master.connect(ctx.destination);
  return ctx;
}

/** Call from any tap: unlocks audio on browsers that need a gesture. */
export function unlock() {
  const a = audio();
  if (a && a.state === "suspended") void a.resume();
  if (musicOn && !musicTimer) startMusic();
}

/** One note: frequency in Hz, start offset and length in seconds. */
function note(freq: number, at: number, len: number, wave: Wave = "square", vol = 1, slideTo?: number) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = wave;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + len);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + len + 0.02);
}

function noise(at: number, len: number, vol = 0.5, highpass = 1000) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + at;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * len), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf;
  f.type = "highpass"; f.frequency.value = highpass;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

// note names → Hz, enough for the tunes below
const N: Record<string, number> = {};
["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].forEach((n, i) => {
  for (let oct = 2; oct <= 7; oct++) N[n + oct] = 440 * 2 ** ((i - 9 + (oct - 4) * 12) / 12);
});
const seq = (notes: string[], step: number, wave: Wave = "square", vol = 0.8, len = step * 0.9) =>
  notes.forEach((n, i) => { if (n !== "-") note(N[n], i * step, len, wave, vol); });

/** Every sound the game makes. */
const SFX = {
  click: () => note(N.A5, 0, 0.04, "square", 0.4),
  flip: () => { note(N.E5, 0, 0.05, "triangle", 0.7, N.A5); noise(0, 0.05, 0.15, 3000); },
  right: () => seq(["E5", "A5"], 0.07),
  wrong: () => note(N.C4, 0, 0.25, "square", 0.6, N.F3),
  gem: () => seq(["B5", "E6"], 0.06, "square", 0.7),
  coin: () => seq(["B5", "E6", "G#6"], 0.05, "square", 0.6),
  hit: () => { noise(0, 0.12, 0.5, 600); note(N.G3, 0, 0.12, "square", 0.6, N.C3); },
  flag: () => seq(["C5", "E5", "G5", "C6", "-", "G5", "C6"], 0.09, "square", 0.7),
  levelUp: () => { seq(["C5", "E5", "G5", "C6", "E6", "G6"], 0.08); seq(["C4", "-", "G4", "-", "C5"], 0.1, "triangle", 0.8); },
  fail: () => seq(["G4", "F#4", "F4", "E4"], 0.14, "triangle", 0.8),
  drop: () => note(N.C6, 0, 0.12, "triangle", 0.8, N.G6),
  buy: () => { seq(["E6", "C6"], 0.05); noise(0.1, 0.08, 0.2, 4000); },
  fairy: () => seq(["E6", "G#6", "B6", "E7", "B6", "G#6"], 0.06, "triangle", 0.6),
  elf: () => seq(["A5", "C6", "E6", "A6"], 0.08, "triangle", 0.7),
  wolf: () => note(N.A3, 0, 0.9, "sawtooth", 0.35, N.E4),
  sibyl: () => { note(N.D4, 0, 0.8, "triangle", 0.7); note(N.A4, 0.1, 0.8, "triangle", 0.5); note(N.F5, 0.2, 0.8, "triangle", 0.4); },
  rain: () => { for (let i = 0; i < 6; i++) noise(i * 0.09, 0.05, 0.12, 5000); },
  tick: () => note(N.C6, 0, 0.03, "square", 0.3),
} as const;
export type Sound = keyof typeof SFX;

export function play(s: Sound) {
  if (!sfxOn) return;
  unlock();
  try { SFX[s](); } catch { /* audio unavailable: the game works without it */ }
}

// ── music: a short loop per region, off unless the player turns it on ───────

const TUNES: Record<string, { bpm: number; lead: string[]; bass: string[] }> = {
  // Veneto: a barcarolle, rocking like a gondola
  A1: { bpm: 96, lead: ["E5", "-", "G5", "E5", "D5", "-", "C5", "-", "D5", "E5", "F5", "-", "E5", "-", "-", "-"],
               bass: ["C3", "-", "G3", "-", "C3", "-", "G3", "-", "G2", "-", "D3", "-", "C3", "-", "G3", "-"] },
  // Emilia-Romagna: a bright mazurka
  A2: { bpm: 132, lead: ["G5", "A5", "B5", "-", "D6", "-", "B5", "G5", "A5", "-", "F#5", "-", "G5", "-", "-", "-"],
               bass: ["G2", "-", "D3", "-", "G2", "-", "D3", "-", "D3", "-", "A2", "-", "G2", "-", "D3", "-"] },
  // Toscana: a slow stornello
  B1: { bpm: 84, lead: ["A4", "C5", "E5", "-", "D5", "C5", "B4", "-", "C5", "-", "A4", "-", "B4", "G#4", "A4", "-"],
               bass: ["A2", "-", "E3", "-", "D3", "-", "E3", "-", "A2", "-", "F3", "-", "E3", "-", "A2", "-"] },
  // Lazio: a little march for the Forum
  B2: { bpm: 112, lead: ["C5", "C5", "G5", "-", "E5", "-", "C5", "-", "F5", "E5", "D5", "-", "C5", "-", "-", "-"],
               bass: ["C3", "-", "C3", "-", "G2", "-", "G2", "-", "F2", "-", "G2", "-", "C3", "-", "G2", "-"] },
};

let musicTimer: number | null = null;
let musicRegion = "A1";

function startMusic() {
  stopMusic();
  const a = audio();
  if (!a) return;
  const tune = TUNES[musicRegion] ?? TUNES.A1;
  const step = 60 / tune.bpm / 2;
  const bar = () => {
    tune.lead.forEach((n, i) => { if (n !== "-") note(N[n], i * step, step * 0.85, "square", 0.25); });
    tune.bass.forEach((n, i) => { if (n !== "-") note(N[n], i * step, step * 1.6, "triangle", 0.45); });
  };
  bar();
  musicTimer = window.setInterval(bar, tune.lead.length * step * 1000);
}
function stopMusic() {
  if (musicTimer !== null) clearInterval(musicTimer);
  musicTimer = null;
}

/** The region whose tune plays; changes the loop only if it is a new region. */
export function setRegion(r: string) {
  if (r === musicRegion) return;
  musicRegion = r;
  if (musicOn && musicTimer !== null) startMusic();
}

export function toggleSfx() { sfxOn = !sfxOn; write(KEY_SFX, sfxOn); if (sfxOn) play("click"); return sfxOn; }
export function toggleMusic() {
  musicOn = !musicOn;
  write(KEY_MUSIC, musicOn);
  if (musicOn) { unlock(); startMusic(); } else stopMusic();
  return musicOn;
}

// a hidden tab stops the music; it comes back when the tab returns
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopMusic();
  else if (musicOn && ctx) startMusic();
});
