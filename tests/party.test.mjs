import { test } from "node:test";
import assert from "node:assert/strict";
import { companionStats, companionMaxHp, companionDrink, companionCantDrink, joinParty, equipCompanion, unequipCompanion, compareCompanionEquip, COMPANIONS } from "../src/rules/party.js";
import { makeItem, equip, upgradeItem, itemName } from "../src/rules/items.js";
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
  assert.equal(s.level, 3);
  assert.equal(s.attack.bonus, COMPANIONS.megan.dexMod + 2);
});

test("Megan starts with a shortbow and leather armour: AC 13, 1d6+2", () => {
  const s = companionStats(withMegan());
  assert.equal(s.ac, 13);
  assert.deepEqual([s.attack.name, s.attack.damage, s.attack.damageBonus], ["Shortbow", "1d6", 2]);
});

test("giving Megan a longbow and studded leather from your pack", () => {
  const h = withMegan();
  const bow = makeItem("longbow"), armour = makeItem("studded");
  h.inventory.push(bow, armour);
  const c = compareCompanionEquip(h, bow.uid);
  assert.equal(c.ok, true);
  assert.equal(c.after.damage, "1d8");
  assert.equal(equipCompanion(h, bow.uid).unequipped[0].base, "shortbow"); // the old bow goes back in your pack
  assert.equal(equipCompanion(h, armour.uid).ok, true);
  const s = companionStats(h);
  assert.equal(s.ac, 14);
  assert.equal(s.attack.damage, "1d8");
  assert.deepEqual(h.inventory.map(i => i.base).sort(), ["leather", "potionHealing", "potionHealing", "shortbow"]);
  assert.equal(unequipCompanion(h, "bow").ok, true);
  assert.equal(companionStats(h).attack.name, "Fist");
});

test("Megan only wears light armour and only uses bows; the hero can't use bows", () => {
  const h = withMegan();
  const mail = makeItem("chainMail"), sword = makeItem("longsword"), bow = makeItem("longbow");
  h.inventory.push(mail, sword, bow);
  assert.match(equipCompanion(h, mail.uid).reason, /light armour/);
  assert.match(equipCompanion(h, sword.uid).reason, /bows/);
  assert.match(equip(h, bow.uid).reason, /friend/);
});

test("the blacksmith upgrades Megan's bow", () => {
  const h = withMegan();
  h.gold = 100;
  const bow = h.companion.gear.bow;
  assert.equal(upgradeItem(h, bow.uid).ok, true);
  assert.equal(itemName(bow), "Shortbow +1");
  const s = companionStats(h);
  assert.equal(s.attack.damageBonus, 3);
  assert.equal(s.attack.bonus, COMPANIONS.megan.dexMod + 2 + 1);
});

test("when you level up in a fight with Megan, she levels up too", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const rng = seededRng(seed);
    const h = withMegan();
    h.xp = 299; h.maxHp = h.hp = 999;
    const b = createBattle(h, ["giantRat"], rng);
    for (let i = 0; i < 100 && b.state === "active"; i++) if (isPlayerTurn(b)) playerAction(b, { type: "attack" }, rng);
    if (b.state !== "won") continue;
    assert.ok(b.log.some(e => e.type === "ally-level-up" && /Megan reaches level 2/.test(e.text)));
    return;
  }
  assert.fail("no win");
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

test("Megan can drink a Potion of Healing from your pack, but not the other potions", () => {
  const h = withMegan();
  h.inventory.push(makeItem("potionHealing"), makeItem("potionSpeed"));
  const [healing, speed] = h.inventory.slice(-2);
  assert.match(companionCantDrink(h, healing), /full health/);
  h.companion.hurt = 6;
  assert.match(companionCantDrink(h, speed), /Only you/);
  assert.equal(companionDrink(h, speed.uid).ok, false);
  const r = companionDrink(h, healing.uid, () => 0); // 2d4+2 rolling all 1s: 4
  assert.equal(r.ok, true);
  assert.equal(r.healed, 4);
  assert.equal(h.companion.hurt, 2);
  assert.ok(!h.inventory.includes(healing));
  assert.ok(h.inventory.includes(speed));
  h.inventory.push(makeItem("potionHealing"));
  assert.equal(companionDrink(h, h.inventory.at(-1).uid, () => 0.99).healed, 2); // never past full
  assert.equal(h.companion.hurt, 0);
});

test("in battle you can give Megan a Potion of Healing, which gets her back up if she's down", () => {
  for (let seed = 1; seed < 300; seed++) {
    const rng = seededRng(seed);
    const h = withMegan();
    const b = createBattle(h, ["giantRat"], rng);
    if (!isPlayerTurn(b) || b.ally.hp <= 0) continue;
    const potions = h.inventory.filter(i => i.base === "potionHealing").length;
    assert.match(playerAction(b, { type: "allyPotion" }, rng).reason, /full health/);
    b.ally.hp = 0; // knocked down
    const r = playerAction(b, { type: "allyPotion" }, rng);
    assert.equal(r.ok, true);
    const e = r.events.find(ev => ev.type === "ally-potion");
    assert.ok(e.heal >= 4 && e.revived);
    assert.ok(e.hp.ally === e.heal);
    assert.equal(h.inventory.filter(i => i.base === "potionHealing").length, potions - 1);
    return;
  }
  assert.fail("no seed gave you the first turn");
});
