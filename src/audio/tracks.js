// The music, written as notes. Each track is a loop of bars of 8 steps (eighth notes).
// A note is a name and octave (C5, F#4, Bb3), "-" holds the previous note one more step, "." is a rest.
// Drums: k kick, s snare, h hi-hat, . nothing. Jingles play once.

export const TRACKS = {
  village: {
    bpm: 92, lead: "triangle", echo: 0.32,
    melody: "E5 - G5 - C6 - B5 A5 | G5 - - - E5 - D5 - | C5 - E5 - G5 - A5 G5 | E5 - - - . . . . | F5 - A5 - C6 - B5 A5 | G5 - E5 - C5 - D5 - | E5 - D5 - C5 - B4 - | C5 - - - . . . .",
    bass: "C3 - G3 - C3 - G3 - | C3 - G3 - C3 - G3 - | A2 - E3 - A2 - E3 - | G2 - D3 - G2 - D3 - | F2 - C3 - F2 - C3 - | C3 - G3 - C3 - G3 - | G2 - D3 - G2 - D3 - | C3 - G3 - C3 - - -",
    drums: ". . h . . . h . | . . h . . . h . | . . h . . . h . | . . h . . . h . | . . h . . . h . | . . h . . . h . | . . h . . . h . | . . h . . . . .",
  },
  wild: {
    bpm: 108, lead: "sawtooth", echo: 0.35,
    melody: "A4 - C5 - E5 - D5 C5 | B4 - - - G4 - - - | A4 - C5 - E5 - G5 - | F5 - E5 - D5 - - - | C5 - D5 - E5 - A5 - | G5 - E5 - D5 - C5 - | B4 - C5 - D5 - E5 - | A4 - - - . . . .",
    bass: "A2 - A2 - E3 - A2 - | G2 - G2 - D3 - G2 - | A2 - A2 - E3 - A2 - | D3 - D3 - A2 - D3 - | C3 - C3 - G2 - C3 - | G2 - G2 - D3 - G2 - | E2 - E2 - B2 - E2 - | A2 - A2 - E3 - A2 -",
    drums: "k . h . s . h . | k . h . s . h . | k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s . h . | k . h . s . h . | k . h . s . h h",
  },
  battle: {
    bpm: 150, lead: "sawtooth", echo: 0.25,
    melody: "E5 . E5 G5 . E5 B5 - | A5 - G5 - F#5 - D5 - | E5 . E5 G5 . E5 B5 - | C6 - B5 - A5 - B5 - | E5 . E5 G5 . E5 B5 - | A5 - G5 - F#5 - D5 - | G5 - F#5 - E5 - D#5 - | E5 - - - . . . .",
    bass: "E2 E2 E2 E2 E2 E2 E2 E2 | E2 E2 E2 E2 D2 D2 D2 D2 | C2 C2 C2 C2 C2 C2 C2 C2 | D2 D2 D2 D2 B1 B1 B1 B1 | E2 E2 E2 E2 E2 E2 E2 E2 | E2 E2 E2 E2 D2 D2 D2 D2 | C2 C2 C2 C2 B1 B1 B1 B1 | E2 E2 E2 E2 E2 . . .",
    drums: "k h s h k k s h | k h s h k k s h | k h s h k k s h | k h s h k s s s | k h s h k k s h | k h s h k k s h | k h s h k k s h | k h s h k s k .",
  },
  boss: {
    bpm: 160, lead: "sawtooth", echo: 0.3,
    melody: "D5 - F5 - A5 - G#5 - | A5 - - - F5 - D5 - | C#5 - E5 - A5 - G5 - | F5 - E5 - D5 - C#5 - | D5 - F5 - A5 - D6 - | C6 - A5 - F5 - A5 - | G5 - F5 - E5 - C#5 - | D5 - - - . . . .",
    bass: "D2 D2 D2 D2 D2 D2 D2 D2 | Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 Bb1 | A1 A1 A1 A1 A1 A1 A1 A1 | D2 D2 D2 D2 C#2 C#2 C#2 C#2 | D2 D2 D2 D2 D2 D2 D2 D2 | Bb1 Bb1 Bb1 Bb1 F2 F2 F2 F2 | G2 G2 G2 G2 A1 A1 A1 A1 | D2 D2 D2 D2 D2 . . .",
    drums: "k h s h k h s h | k h s h k k s h | k h s h k h s h | k h s s k s s s | k h s h k h s h | k h s h k k s h | k h s h k h s h | k s k s k s k .",
  },
  victory: {
    bpm: 150, lead: "sawtooth", echo: 0.3, once: true,
    melody: "C5 E5 G5 C6 - - G5 C6 | - - - - - - . .",
    bass: "C3 - - - - - G2 C3 | - - - - - - . .",
    drums: "k . . . s . k s | k . . . . . . .",
  },
  levelUp: {
    bpm: 180, lead: "triangle", echo: 0.35, once: true,
    melody: "C5 E5 G5 C6 E6 G6 C7 - | - - . . . . . .",
    bass: "C3 - - - G3 - C4 - | - - . . . . . .",
    drums: ". . . . . . . . | . . . . . . . .",
  },
  defeat: {
    bpm: 80, lead: "triangle", echo: 0.4, once: true,
    melody: "A4 - G4 - F4 - E4 - | - - - - . . . .",
    bass: "A2 - - - D2 - E2 - | A1 - - - . . . .",
    drums: ". . . . . . . . | . . . . . . . .",
  },
};

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/* "C#5" -> MIDI note number (C4 = 60). */
export function midi(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note ${name}`);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

const steps = line => line.split("|").flatMap(bar => bar.trim().split(/\s+/));

/* A note line -> [{ step, note, length }] with "-" folded into the length. */
export function parseNotes(line) {
  const out = [];
  steps(line).forEach((tok, i) => {
    if (tok === "-") { if (out.length && out.at(-1).step + out.at(-1).length === i) out.at(-1).length++; return; }
    if (tok !== ".") out.push({ step: i, note: midi(tok), length: 1 });
  });
  return out;
}

/* A track -> its length in steps, the step duration, and the notes and drum hits. */
export function compile(name) {
  const t = TRACKS[name];
  const length = steps(t.melody).length;
  for (const part of ["bass", "drums"]) {
    if (steps(t[part]).length !== length) throw new Error(`${name}: ${part} is ${steps(t[part]).length} steps, melody is ${length}`);
  }
  const drums = steps(t.drums).map((d, step) => ({ step, hit: d })).filter(d => d.hit !== ".");
  return { ...t, name, length, stepDur: 60 / t.bpm / 2, melody: parseNotes(t.melody), bass: parseNotes(t.bass), drums };
}
