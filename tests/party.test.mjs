import { test } from "node:test";
import assert from "node:assert/strict";
import { companionStats, companionMaxHp, joinParty, COMPANIONS } from "../src/rules/party.js";
import { createBattle, playerAction, isPlayerTurn } from "../src/rules/combat.js";
import { createCharacter, gainXp, rest } from "../src/rules/character.js";
import { seededRng } from "../src/rules/dice.js";

const withMegan = () => { const h = createCharacter(); joinParty(h, "megan"); return h; };

test("no companion, no ally in battle", () => {
  const b = createBattle(createCharacter(), ["goblin"], seededRng(1));
  assert.equal(b.ally, null);
  assert.ok(!b.order.some(e => e.who === "ally"));
});

test("Megan grows with your level", () => {
  const h = withMegan();
  assert.equal(companionStats(h).maxHp, COMPANIONS.megan.hpBase);
  gainXp(h, 900, () => 0.5); // level 3
  const s = companionStats(h);
  assert.equal(s.maxHp, companionMaxHp("megan", 3));
  assert.equal(s.attack.bonus, COMPANIONS.megan.attack.ability + 2);
});

test("Megan takes turns in battle and shoots at the monster you attacked", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = seededRng(seed);
    const b = createBattle(withMegan(), ["giantRat", "giantRat"], rng);
    assert.ok(b.order.some(e => e.who === "ally"));
    if (!isPlayerTurn(b)) continue;
    b.monsters[1].hp = 99; b.monsters[1].maxHp = 99; // a big one so it doesn't fall
    const r = playerAction(b, { type: "attack", target: 1 }, rng);
    const shot = r.events.find(e => e.type === "ally-attack");
    if (!shot) continue; // Megan acts before you this round
    assert.equal(shot.target, 1);
    assert.match(shot.text, /^Megan shoots/);
    return;
  }
  assert.fail("no seed showed Megan's turn after yours");
});

test("monsters sometimes go for Megan; if she falls the fight goes on, and she's back up afterwards", () => {
  let sawHit = false, sawDown = false;
  for (let seed = 1; seed <= 300 && !(sawHit && sawDown); seed++) {
    const rng = seededRng(seed);
    const hero = withMegan();
    hero.maxHp = hero.hp = 999; // so the fights end with a win
    const b = createBattle(hero, ["wolf", "wolf"], rng);
    for (let i = 0; i < 300 && b.state === "active"; i++) if (isPlayerTurn(b)) playerAction(b, { type: "attack" }, rng);
    assert.equal(b.state, "won");
    if (b.log.some(e => e.onAlly)) sawHit = true;
    if (b.log.some(e => e.type === "ally-down")) {
      sawDown = true;
      assert.equal(hero.companion.hurt, companionMaxHp("megan", hero.level) - 1); // back up with 1 HP
    }
    for (const e of b.log) assert.equal(typeof e.hp.ally, "number");
  }
  assert.ok(sawHit && sawDown);
});

test("Megan keeps her wounds between fights until you rest", () => {
  const h = withMegan();
  h.companion.hurt = 5;
  const b = createBattle(h, ["goblin"], seededRng(3));
  assert.equal(b.log[0].hp.ally, companionMaxHp("megan", 1) - 5); // before anyone has acted
  rest(h);
  assert.equal(h.companion.hurt, 0);
});
