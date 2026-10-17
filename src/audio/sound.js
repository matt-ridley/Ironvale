// Music and sound effects, synthesised in the browser (Web Audio), in a 16-bit style: a filtered lead with echo,
// a soft bass, simple drums. No audio files.
// Browsers only allow sound after the player touches or presses something, so unlockAudio() is called on the first
// tap or key press; music asked for before that starts then.
import { compile } from "./tracks.js";

const SETTINGS_KEY = "ironvale-settings";
const LOOKAHEAD = 0.15; // seconds of music scheduled ahead

let ac = null, master, musicBus, sfxBus, echoIn;
let muted = loadMuted();
let wanted = null; // the track that should be playing
let playing = null; // { track, step, time }
let timer = null;
let noiseBuf = null;

function loadMuted() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}").muted === true; } catch { return false; }
}
function saveMuted() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ muted })); } catch { /* not saved */ }
}

export const isMuted = () => muted;

export function toggleMuted() {
  muted = !muted;
  saveMuted();
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ac.currentTime, 0.05);
  return muted;
}

/* Call from a tap or key press. Safe to call often. */
export function unlockAudio() {
  if (!ac) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    // The echo that gives the SNES feel: a delay feeding back into itself, darkened a little each time round.
    echoIn = ac.createGain();
    const delay = ac.createDelay(1), fb = ac.createGain(), tone = ac.createBiquadFilter();
    delay.delayTime.value = 0.19; fb.gain.value = 0.32; tone.type = "lowpass"; tone.frequency.value = 2400;
    echoIn.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(musicBus);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    document.addEventListener("visibilitychange", () => { if (document.hidden) ac.suspend(); else ac.resume(); });
  }
  if (ac.state === "suspended") ac.resume();
  if (wanted && (!playing || playing.track.name !== wanted)) startTrack(wanted);
}

const hz = m => 440 * Math.pow(2, (m - 69) / 12);

function tone(type, freq, start, dur, vol, out, { attack = 0.01, release = 0.08, cutoff = 0, glideTo = 0 } = {}) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(vol, start + attack);
  g.gain.setValueAtTime(vol, Math.max(start + attack, start + dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  let node = o;
  if (cutoff) { const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff; o.connect(f); node = f; }
  node.connect(g);
  for (const dest of [].concat(out)) g.connect(dest);
  o.start(start); o.stop(start + dur + 0.02);
}

function noise(start, dur, vol, out, { type = "highpass", freq = 6000, sweepTo = 0 } = {}) {
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = noiseBuf;
  f.type = type; f.frequency.setValueAtTime(freq, start);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, start + dur);
  g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f); f.connect(g); g.connect(out);
  src.start(start, Math.random() * 0.5); src.stop(start + dur + 0.02);
}

function drum(hit, t) {
  if (hit === "k") tone("sine", 140, t, 0.16, 0.9, musicBus, { attack: 0.002, release: 0.12, glideTo: 45 });
  else if (hit === "s") noise(t, 0.12, 0.35, musicBus, { type: "bandpass", freq: 1800 });
  else if (hit === "h") noise(t, 0.035, 0.12, musicBus, { type: "highpass", freq: 7000 });
}

/* Music: schedules the next few notes ahead, every 25 ms. */
function startTrack(name) {
  stopTrack();
  if (!ac) return;
  const track = compile(name);
  playing = { track, step: 0, time: ac.currentTime + 0.08 };
  timer = setInterval(schedule, 25);
  schedule();
}

function stopTrack() {
  if (timer) clearInterval(timer);
  timer = null;
  playing = null;
}

function schedule() {
  const p = playing;
  if (!p) return;
  const t = p.track;
  while (p.time < ac.currentTime + LOOKAHEAD) {
    const dur = n => n.length * t.stepDur;
    for (const n of t.melody) if (n.step === p.step) {
      tone(t.lead, hz(n.note), p.time, dur(n) * 0.95, 0.22, [musicBus, echoIn], { attack: 0.015, cutoff: t.lead === "sawtooth" ? 2400 : 0 });
    }
    for (const n of t.bass) if (n.step === p.step) tone("triangle", hz(n.note), p.time, dur(n) * 0.9, 0.42, musicBus, { attack: 0.005 });
    for (const d of t.drums) if (d.step === p.step) drum(d.hit, p.time);
    p.time += t.stepDur;
    p.step++;
    if (p.step >= t.length) {
      if (t.once) { stopTrack(); wanted = null; return; }
      p.step = 0;
    }
  }
}

/* Plays a looping track (village, wild, battle, boss); does nothing if it is already playing. */
export function playMusic(name) {
  wanted = name;
  if (ac && ac.state !== "closed" && (!playing || playing.track.name !== name)) startTrack(name);
}

/* Plays a short tune once (victory, levelUp, defeat), replacing the music. */
export function playJingle(name) {
  wanted = null;
  if (ac) startTrack(name);
}

export function stopMusic() {
  wanted = null;
  stopTrack();
}

/* Sound effects. */
const SFX = {
  sword: t => { noise(t, 0.16, 0.5, sfxBus, { type: "bandpass", freq: 3200, sweepTo: 600 }); },
  hit: t => { tone("square", 220, t, 0.14, 0.35, sfxBus, { attack: 0.002, glideTo: 60, cutoff: 1800 }); noise(t, 0.1, 0.5, sfxBus, { type: "lowpass", freq: 1200 }); },
  crit: t => { SFX.hit(t); tone("sawtooth", 880, t, 0.2, 0.2, sfxBus, { attack: 0.002, glideTo: 220, cutoff: 3000 }); },
  miss: t => { noise(t, 0.22, 0.3, sfxBus, { type: "highpass", freq: 2500, sweepTo: 8000 }); },
  hurt: t => { tone("square", 160, t, 0.2, 0.35, sfxBus, { attack: 0.002, glideTo: 50, cutoff: 1200 }); noise(t, 0.12, 0.4, sfxBus, { type: "lowpass", freq: 900 }); },
  coin: t => { tone("square", hz(83), t, 0.07, 0.25, sfxBus, { attack: 0.002, cutoff: 5000 }); tone("square", hz(88), t + 0.07, 0.22, 0.25, sfxBus, { attack: 0.002, cutoff: 5000 }); },
  heal: t => { [72, 76, 79, 84].forEach((n, i) => tone("triangle", hz(n), t + i * 0.06, 0.18, 0.35, sfxBus, { attack: 0.01 })); },
  select: t => { tone("square", hz(84), t, 0.05, 0.18, sfxBus, { attack: 0.002, cutoff: 4000 }); },
  back: t => { tone("square", hz(76), t, 0.06, 0.15, sfxBus, { attack: 0.002, cutoff: 3000 }); },
  door: t => { tone("triangle", 90, t, 0.25, 0.6, sfxBus, { attack: 0.002, glideTo: 55 }); noise(t, 0.08, 0.25, sfxBus, { type: "lowpass", freq: 600 }); },
  clang: t => { [1, 2.76, 5.4].forEach(m => tone("square", 420 * m, t, 0.5, 0.12, sfxBus, { attack: 0.001, release: 0.45, cutoff: 6000 })); },
  alert: t => { tone("sawtooth", hz(81), t, 0.08, 0.3, sfxBus, { attack: 0.002, cutoff: 3000 }); tone("sawtooth", hz(88), t + 0.08, 0.16, 0.3, sfxBus, { attack: 0.002, cutoff: 3000 }); },
  step: t => { noise(t, 0.04, 0.06, sfxBus, { type: "lowpass", freq: 700 }); },
};

export function sfx(name) {
  if (!ac || muted || ac.state !== "running") return;
  SFX[name]?.(ac.currentTime + 0.005);
}

/* "locked" until the first tap or key press, then the browser's state ("running", "suspended"). */
export const audioState = () => (ac ? ac.state : "locked");
export const nowPlaying = () => playing?.track.name || null;
