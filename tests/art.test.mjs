import { test } from "node:test";
import assert from "node:assert/strict";
import { MONSTER_ART } from "../src/art/monsters.js";
import { SPRITES, PALETTE } from "../src/art/sprites.js";
import { MONSTERS } from "../src/data/monsters.js";

test("every monster has art", () => {
  for (const id of Object.keys(MONSTERS)) assert.ok(MONSTER_ART[id] || SPRITES[id], `${id} has no art`);
});

test("traced monsters are rectangles of known colours, with an outline", () => {
  for (const [id, { rows, colours }] of Object.entries(MONSTER_ART)) {
    assert.ok(rows.every(r => r.length === rows[0].length), `${id} has uneven rows`);
    for (const ch of new Set(rows.join(""))) if (ch !== ".") assert.match(colours[ch] || "", /^#[0-9a-f]{6}$/, `${id}: no colour for ${ch}`);
    assert.ok(colours.k, `${id} has no outline colour`);
    assert.ok(!SPRITES[id], `${id} is drawn twice`);
  }
});

test("hand-drawn sprites only use the shared palette", () => {
  for (const [id, rows] of Object.entries(SPRITES)) for (const ch of new Set(rows.join(""))) if (ch !== ".") assert.ok(PALETTE[ch], `${id}: no colour for ${ch}`);
});
