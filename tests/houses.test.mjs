import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../src/world/maps.js";
import { HOUSES } from "../src/world/houses.js";
import { createMap, doorAt, exitAt, isWalkable, reachable, tileAt, zoneAt } from "../src/world/map.js";
import { rollEncounter } from "../src/world/encounters.js";
import { SCRIPTS } from "../src/story/scripts.js";
import { startConversation, view, choose } from "../src/story/dialogue.js";
import { createCharacter } from "../src/rules/character.js";
import { joinParty } from "../src/rules/party.js";
import { SPRITES } from "../src/art/sprites.js";
import { feetAt } from "../src/world/movement.js";

const world = MAPS.overworld;
const fresh = (flags = {}) => ({ hero: createCharacter(), flags: { ...flags }, pos: feetAt(5, 5) });
const labels = c => view(c).choices.map(x => x.label);
const pick = (c, label) => choose(c, labels(c).indexOf(label));

test("every plain door on the overworld leads into a house", () => {
  world.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === "D") assert.ok(doorAt(world, x, y), `the door at ${x},${y} goes nowhere`);
  }));
  assert.equal(world.doors.length, HOUSES.length);
  for (const d of world.doors) assert.ok(MAPS[d.to], `no map called ${d.to}`);
});

test("you can walk up to every house door from the village", () => {
  const from = reachable(world, world.spawn);
  for (const d of world.doors) assert.ok(from.has(`${d.x},${d.y + 1}`), `can't reach the ${d.name} door`);
});

test("inside, you start next to the doormat, and the doormat takes you back out in front of the door", () => {
  for (const d of world.doors) {
    const room = MAPS[d.to];
    assert.ok(isWalkable(room, room.spawn.x, room.spawn.y), `${room.name}: you start in a wall`);
    assert.equal(exitAt(room, room.spawn.x, room.spawn.y), null, `${room.name}: you'd walk straight out again`);
    const [exit] = room.exits;
    assert.equal(tileAt(room, exit.x, exit.y).name, "doormat");
    assert.ok(reachable(room, room.spawn).has(`${exit.x},${exit.y}`), `${room.name}: can't reach the doormat`);
    assert.equal(exit.to, "overworld");
    assert.deepEqual(exit.at, { x: d.x, y: d.y + 1 });
    assert.equal(exit.facing, "down");
  }
});

test("everyone and everything in a house can be reached", () => {
  for (const room of HOUSES.map(h => MAPS[h.name])) {
    const from = reachable(room, room.spawn);
    for (const o of room.objects) {
      const next = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => from.has(`${o.x + dx},${o.y + dy}`));
      assert.ok(next, `${room.name}: can't reach ${o.id}`);
      assert.ok(SCRIPTS[o.script], `${o.id} has no script`);
      assert.ok(SPRITES[o.sprite], `${o.id} has no sprite`);
    }
  }
});

test("houses are indoors: no monsters", () => {
  for (const room of HOUSES.map(h => MAPS[h.name])) {
    const zone = zoneAt(room, room.spawn.x, room.spawn.y);
    assert.equal(zone.id, "indoors");
    assert.equal(rollEncounter(zone.id, "floorboards", 99, () => 0), null);
  }
});

test("a door has to be on a door tile", () => {
  assert.throws(() => createMap({ name: "bad", rows: ["..."], zones: [], doors: [{ x: 1, y: 0, to: "x" }] }), /door tile/);
});

test("Hazel gives you a Potion of Healing the first time only", () => {
  const s = fresh();
  const c = startConversation(SCRIPTS.hazel, s);
  assert.equal(view(c).speaker, "HAZEL");
  choose(c);
  assert.match(view(c).text, /Potion of Healing/);
  assert.equal(s.hero.inventory.filter(i => i.base === "potionHealing").length, 3); // 2 to start, 1 from her
  assert.equal(s.flags.metHazel, true);
  const again = startConversation(SCRIPTS.hazel, s);
  assert.equal(again.node, "again");
  assert.equal(s.hero.inventory.length, 3);
  assert.match(view(startConversation(SCRIPTS.hazel, fresh({ metHazel: true, chiefDefeated: true }))).text, /spare bed/);
});

test("Old Tom's bed is a full rest once he's said you can use it", () => {
  const stranger = fresh();
  stranger.hero.hp = 3;
  const c = startConversation(SCRIPTS.bed, stranger);
  assert.match(view(c).text, /ask him/);
  assert.equal(stranger.hero.hp, 3);

  const s = fresh({ metTom: true });
  joinParty(s.hero, "megan");
  s.hero.hp = 3; s.hero.secondWind = false; s.hero.companion.hurt = 4;
  const bed = startConversation(SCRIPTS.bed, s);
  pick(bed, "Sleep (full rest)");
  assert.equal(s.hero.hp, s.hero.maxHp);
  assert.equal(s.hero.secondWind, true);
  assert.equal(s.hero.companion.hurt, 0);
  assert.match(view(bed).text, /both sleep/);
});

test("Old Tom offers the bed after his gift", () => {
  const s = fresh();
  const c = startConversation(SCRIPTS.fisher, s);
  choose(c); // to the gift
  choose(c); // to the hut
  assert.match(view(c).text, /spare bed/);
});

test("Maren's journal follows the quests", () => {
  assert.match(view(startConversation(SCRIPTS.journal, fresh())).text, /fallen oak/);
  assert.match(view(startConversation(SCRIPTS.journal, fresh({ chiefDefeated: true }))).text, /KING/);
  assert.match(view(startConversation(SCRIPTS.journal, fresh({ chiefDefeated: true, kingDefeated: true }))).text, /village book/);
});

test("a game saved inside a house loads inside it", async () => {
  const { serialize, deserialize } = await import("../src/state/save.js");
  const room = MAPS.tomHut;
  const s = { hero: createCharacter(), map: room.name, pos: feetAt(room.spawn.x, room.spawn.y), facing: "up", stepsSinceFight: 0, flags: {} };
  const loaded = deserialize(serialize(s));
  assert.equal(loaded.map, "tomHut");
  assert.deepEqual(loaded.pos, s.pos);
});
