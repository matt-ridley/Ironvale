// Guards for the offline install: the service worker must save every game file, at the right version.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { VERSION } from "../src/config.js";
import { SPRITES, PALETTE } from "../src/art/sprites.js";
import { HERO_FRAMES, HERO_COLOURS, HERO_W, HERO_H } from "../src/art/hero.js";
import { MEGAN_FRAMES, MEGAN_COLOURS } from "../src/art/megan.js";

const sw = readFileSync("sw.js", "utf8");
const listFiles = dir => readdirSync(dir, { withFileTypes: true })
  .flatMap(d => (d.isDirectory() ? listFiles(join(dir, d.name)) : [join(dir, d.name).replaceAll("\\", "/")]));

test("sw.js has the same VERSION as src/config.js", () => {
  assert.equal(sw.match(/const VERSION = "([^"]+)"/)[1], VERSION);
});

test("sw.js saves every file under src/", () => {
  const listed = JSON.parse(`[${sw.match(/const APP_FILES = \[([\s\S]*?)\];/)[1].replace(/,\s*$/, "")}]`);
  for (const f of listFiles("src")) assert.ok(listed.includes(f), `${f} is missing from APP_FILES in sw.js`);
});

test("sw.js and index.html load the same Phaser", () => {
  const url = sw.match(/const PHASER = "([^"]+)"/)[1];
  assert.ok(readFileSync("index.html", "utf8").includes(url));
});

test("every sprite is a rectangle that only uses palette colours", () => {
  for (const [key, rows] of Object.entries(SPRITES)) {
    for (const row of rows) {
      assert.equal(row.length, rows[0].length, `${key} has an uneven row`);
      for (const ch of row) assert.ok(ch === "." || PALETTE[ch], `${key} uses unknown colour "${ch}"`);
    }
  }
});

test("every hero and Megan frame is 16 x 24 and only uses that sheet's colours", () => {
  for (const [who, all, colours] of [["hero", HERO_FRAMES, HERO_COLOURS], ["megan", MEGAN_FRAMES, MEGAN_COLOURS]]) {
    for (const [facing, frames] of Object.entries(all)) {
      assert.equal(frames.length, 4, `${who} ${facing}`);
      frames.forEach((rows, i) => {
        assert.equal(rows.length, HERO_H, `${who} ${facing} ${i}`);
        for (const row of rows) {
          assert.equal(row.length, HERO_W, `${who} ${facing} ${i}: ${row}`);
          for (const ch of row) assert.ok(ch === "." || colours[ch], `${who} ${facing} ${i} uses "${ch}"`);
        }
      });
    }
  }
});
