import { test } from "node:test";
import assert from "node:assert/strict";
import { TRACKS, compile, midi, parseNotes } from "../src/audio/tracks.js";

test("note names become MIDI numbers", () => {
  assert.equal(midi("C4"), 60);
  assert.equal(midi("A4"), 69);
  assert.equal(midi("F#5"), 78);
  assert.equal(midi("Bb1"), 34);
  assert.throws(() => midi("H2"));
});

test("held notes lengthen, rests are skipped", () => {
  assert.deepEqual(parseNotes("C5 - - E5 | . G5 - ."), [
    { step: 0, note: 72, length: 3 },
    { step: 3, note: 76, length: 1 },
    { step: 5, note: 79, length: 2 },
  ]);
});

test("every track compiles, with melody, bass and drums the same length and whole bars", () => {
  for (const name of Object.keys(TRACKS)) {
    const t = compile(name);
    assert.equal(t.length % 8, 0, `${name} is ${t.length} steps`);
    assert.ok(t.melody.length > 0, name);
    for (const d of t.drums) assert.ok("ksh".includes(d.hit), `${name}: drum "${d.hit}"`);
  }
});
