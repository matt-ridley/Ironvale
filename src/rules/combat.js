// Turn-based combat: initiative, attack rolls against AC, and the player's actions (attack, defend, potion, flee,
// Second Wind, a bonus action that heals without using up the turn, and Action Surge, which gives you one more action
// this turn). ATTACK is one attack, or two with Extra Attack (level 5); a Potion of Dexterity, drunk before or during
// the fight, adds one more. From level 3 your attacks crit on a 19 or 20.
// Conditions (rules/conditions.js: asleep, restrained, blessed...) change attacks, AC and saves, and can take away a
// turn; they start and end with each turn. Spells and scrolls (rules/magic.js) are cast through the helpers below.
// Your companion's turns are played by rules/tactics.js, or wait for you when you lead them (battle.leadAlly). A companion in your party (rules/party.js) takes their own turns:
// they shoot at the monster you last attacked, and monsters pick between you and them.
// Some fights have a second companion (createBattle's `second`): battle.ally2, with the key "ally2", who works just like
// the first (battle.leadAlly2 when you lead them). Monsters pick between all of you who are standing.
// A companion in Wild Shape (Claire: `form` on them) uses the beast's AC, and the beast's HP takes the damage first.
// Lingering spells (Moonbeam, Call Lightning) hurt a monster at the start of each of its turns, and a summoned wolf pack
// (battle.pack) bites every monster at the start of its summoner's turn, for a few rounds.
// A battle is a plain object. The player acts with playerAction(); monsters then take their turns until it is the
// player's turn again or the battle is over. Every step is written to battle.log for the screen to show.
import { d20, roll } from "./dice.js";
import { armourClass, weaponAttack, mod, gainXp, heal, SECOND_WIND, critOn, attacksPerAction, hasFeature, SAVE_PROFICIENCIES, proficiencyBonus, runesLeft, knowsRune, canIndomitable, runeDc, IRON_WARD_AC } from "./character.js";
import { abilityCheck } from "./checks.js";
import { baseOf, makeItem, itemName, useItem, cantDrink } from "./items.js";
import { MONSTERS } from "../data/monsters.js";
import { statsOf, afterBattle } from "./party.js";
import { attackMods, conditionAc, skipsTurn, startTurn, endTurn, onDamage, conditionSave, addCondition, removeCondition, CONDITIONS } from "./conditions.js";
import { ITEMS } from "../data/items.js";
import { allyTurn, canCounter, counter, counterKey } from "./tactics.js"; // (tactics.js uses this file's helpers too; nothing runs until a fight)

export const DEFEND_AC_BONUS = 2;
export const CALL_ENDS = ["paralyzed", "frightened", "asleep", "restrained"]; // what Warden's Call shakes off
export const IRON_SKIN = 3; // the Oath of Iron: weapon hits on you do this much less
export const DAWN_AURA = "1d6"; // the Oath of Dawn: healing at the start of your turn (twice over with the Dawn banner)
export const STORM_GLASS = "3d8"; // the Oath of Storm's vault: Chain Lightning leaps once more, to the first monster standing
/* True if fire only does you half (a Potion of Fire Resistance this fight, or the Wardens' tower shield on your arm). */
export const fireproof = battle => !!battle.fireResist || !!(battle.player.equipment?.shield && baseOf(battle.player.equipment.shield).fireproof);
const carries = (char, base) => !!char.inventory?.some(i => i.base === base);
const oathOf = battle => battle.player.oath || null;
export const FLEE_DC = 10;

export function spawnMonster(id, rng = Math.random) {
  const m = MONSTERS[id];
  if (!m) throw new Error(`Unknown monster: ${id}`);
  const hp = Math.max(1, roll(m.hp, rng).total);
  const attacks = attacksOf(m).map(a => ({ ...a, damageBonus: 0 }));
  // How the log names it: "the Troll", but a monster with a name of its own (`proper`) is just "Auntie Nettle".
  const the = m.proper ? m.name : `the ${m.name}`;
  return { id, name: m.name, label: m.label || m.name, the, The: the[0].toUpperCase() + the.slice(1), type: m.type, saves: { ...m.saves }, ac: m.ac, hp, maxHp: hp, dexMod: m.dexMod, attack: attacks[0], attacks, xp: m.xp, gold: m.gold,
    vulnerable: m.vulnerable || [], resistant: m.resistant || [], immune: m.immune || [], weaponResist: m.weaponResist || null, ...(m.regen && { regen: { ...m.regen } }),
    ...(m.spells && { spells: m.spells, spellsLeft: Object.fromEntries(m.spells.map(sp => [sp.name, sp.uses])) }),
    ...(m.guardedBy !== undefined && { guardedBy: m.guardedBy }), ...(m.hesitates && { hesitates: true }) };
}

export const WEAPON_DAMAGE = ["slashing", "piercing", "bludgeoning"];
/* Damage after the target's weaknesses and resistances: { damage, note } where note is "weak", "resists", "immune" or
   null. `immune` types do nothing (fire, to a hell hound), `vulnerable` ones double, `resistant` ones half;
   `weaponResist: "silver"` (wights) halves weapon damage unless the weapon is silvered, and `weaponResist: "magic"`
   (gargoyles, elementals) unless it's magic (upgraded, or the Wardenblade). Only monsters have these. Damage of a type that stops a monster's regeneration (a troll's fire) stops
   it next turn. */
export function adjustDamage(target, damage, type, { silvered = false, magic = false } = {}) {
  if (!damage || !type) return { damage, note: null };
  if (target.immune?.includes(type)) return { damage: 0, note: "immune" };
  if (target.regen?.stop?.includes(type)) target.regenBlocked = true;
  if (target.vulnerable?.includes(type)) return { damage: damage * 2, note: "weak" };
  const weaponProof = WEAPON_DAMAGE.includes(type) && ((target.weaponResist === "silver" && !silvered) || (target.weaponResist === "magic" && !magic));
  if (target.resistant?.includes(type) || weaponProof) {
    return { damage: Math.floor(damage / 2), note: "resists" };
  }
  return { damage, note: null };
}
/* Applies adjustDamage to an attack roll's result (in place), for the log and the screen. */
export function adjustRoll(r, target, attack) {
  if (!r.hit) return r;
  const a = adjustDamage(target, r.damage, attack.damageType, { silvered: attack.silvered, magic: attack.magic });
  r.damage = a.damage;
  r.note = a.note;
  return r;
}

/* A monster's attacks each turn: its `attacks` (a multiattack, like the lizardfolk's bite and shield), or its one `attack`. */
export const attacksOf = m => m.attacks || [m.attack];

/* One attack roll. A critical hit (a natural 20, or `critOn` and up) always hits and doubles the damage dice; a natural
   1 always misses. `bonusDice` are added to the roll (Bless); `critOnHit` makes any hit a critical (on someone
   paralyzed). */
export function resolveAttack(attack, targetAc, rng = Math.random, { advantage = false, disadvantage = false, critOn = 20, bonusDice = null, critOnHit = false } = {}) {
  const { rolls, natural } = d20({ advantage, disadvantage }, rng);
  const extra = bonusDice ? roll(bonusDice, rng).total : 0;
  const total = natural + attack.bonus + extra;
  const hit = natural >= critOn || (natural !== 1 && total >= targetAc);
  const crit = natural >= critOn || (hit && critOnHit);
  let damage = 0, damageRolls = [];
  if (hit) {
    const r = roll(attack.damage, rng, { crit, extraBonus: attack.damageBonus || 0 });
    damage = Math.max(0, r.total);
    damageRolls = r.rolls;
  }
  return { rolls, natural, extra, total, targetAc, hit, crit, damage, damageRolls };
}

export const living = battle => battle.monsters.filter(m => m.hp > 0);
const playerAc = battle => armourClass(battle.player) + (battle.defending ? DEFEND_AC_BONUS : 0) + conditionAc(battle, "player");

// Everyone in a fight has a key: "player", "ally" (your companion), "ally2" (a second one) or a monster's index.
export const ALLY_KEYS = ["ally", "ally2"];
export const isAllyKey = key => key === "ally" || key === "ally2";
/* The keys of the companions in this fight. */
export const allyKeys = battle => ALLY_KEYS.filter(k => battle[k]);
/* You and your companions. */
export const partyKeys = battle => ["player", ...allyKeys(battle)];
/* The hero, companion or monster with this key. */
export const combatant = (battle, key) => (key === "player" ? battle.player : isAllyKey(key) ? battle[key] : battle.monsters[key]);
export const nameOf = (battle, key) => (key === "player" ? "You" : isAllyKey(key) ? battle[key].name : `${battle.monsters[key].The}`);
export const acOf = (battle, key) => { const c = combatant(battle, key); return key === "player" ? playerAc(battle) : (c.form?.ac ?? c.ac) + conditionAc(battle, key) + guardAc(battle, key); };
/* A monster warded by its shield guardian (`guardedBy`): +3 AC while the guardian stands. */
export const GUARD_AC = 3;
const guardAc = (battle, key) => { const g = battle.monsters[key]?.guardedBy; return g !== undefined && battle.monsters[g]?.hp > 0 ? GUARD_AC : 0; };

/* Someone's saving throw bonus: the hero's ability modifier (+ proficiency in a fighter's STR and CON saves), a
   companion's DEX (other saves +0), or a monster's listed save. */
export function saveBonusOf(battle, key, ability) {
  if (key === "player") return mod(battle.player, ability) + (SAVE_PROFICIENCIES.includes(ability) ? proficiencyBonus(battle.player.level) : 0);
  if (isAllyKey(key)) return battle[key].saves?.[ability] ?? 0;
  return battle.monsters[key].saves?.[ability] ?? 0;
}

/* A saving throw in a fight, with conditions (Bless, restrained) counted. opts.advantage: rolled with advantage. */
export const battleSave = (battle, key, ability, dc, rng = Math.random, opts = {}) => conditionSave(battle, key, ability, dc, saveBonusOf(battle, key, ability), rng, opts);

/* A saving throw against something a monster does to you: Pip's Junior Warden badge adds 1 to one that only just
   failed (once per rest), and from level 9, Indomitable rolls a failed one again (once per long rest). Both say so in
   the log. */
export function resistSave(battle, key, ability, dc, rng = Math.random) {
  const s = battleSave(battle, key, ability, dc, rng);
  const p = battle.player;
  if (!s.success && key === "player" && s.total + 1 >= dc && !p.badgeUsed && p.inventory.some(i => i.base === "juniorBadge")) {
    p.badgeUsed = true; // Pip's Junior Warden badge, once per rest
    say(battle, "badge", `${ability} save ${s.total} vs DC ${dc}... your Junior Warden badge glints: +1, and that's enough!`);
    return { ...s, total: s.total + 1, success: true };
  }
  if (s.success || key !== "player" || !canIndomitable(battle.player)) return s;
  battle.player.indomitableUsed = (battle.player.indomitableUsed || 0) + 1;
  say(battle, "indomitable", `${ability} save ${s.total} vs DC ${dc}... Indomitable! You refuse to give in, and roll again.`);
  return battleSave(battle, key, ability, dc, rng);
}

/* Takes HP off someone (never below 0) and wakes them if they were asleep. Call it before logging the hit (each log
   entry records everyone's HP), then tellWoken() after. Returns the names of conditions the damage ended. A companion
   in Wild Shape: the beast takes it, and when its HP runs out she turns back ("a bear" is what ended), unhurt. */
export function hurt(battle, key, damage) {
  const c = combatant(battle, key);
  if (c.form && damage > 0) {
    c.form.hp = Math.max(0, c.form.hp - damage);
    if (c.form.hp > 0) return onDamage(battle, key);
    const was = c.form.name;
    c.form = null;
    return [`a ${was}`];
  }
  c.hp = Math.max(0, c.hp - Math.max(0, damage));
  return damage > 0 && c.hp > 0 ? onDamage(battle, key) : [];
}
export function tellWoken(battle, key, ended) {
  for (const name of ended) say(battle, "condition-end", `${nameOf(battle, key)} ${key === "player" ? "are" : "is"} no longer ${name}.`);
}

/* Rolls initiative (d20 + DEX; ties go to the higher DEX, then the player) and plays monster turns up to the player's.
   opts.surviveRounds: a waystone's trial, where the monsters crumble once you've held out that many rounds.
   opts.second: a second companion's record (party.js: secondCompanion), who fights beside your own. opts.allies: the
   fight's own party instead (records, at most two: Q10's twins, party.js partyRecords). Each companion in the fight
   keeps the record they came from as `src` (their wounds and spell slots go back there). */
export function createBattle(player, monsterIds, rng = Math.random, { surviveRounds = 0, second = null, allies: own = null } = {}) {
  const monsters = monsterIds.map(id => spawnMonster(id, rng));
  const allies = (own || [player.companion, second]).slice(0, 2).map(c => { const s = statsOf(c, player.level); return s && { ...s, src: c }; }).filter(Boolean);
  allies.forEach((a, i) => { a.key = ALLY_KEYS[i]; });
  const ally = allies[0] || null, ally2 = allies[1] || null;
  const entries = [
    { who: "player", init: d20({}, rng).natural + mod(player, "DEX"), dex: mod(player, "DEX"), tie: 2 },
    ...allies.map(a => ({ who: a.key, init: d20({}, rng).natural + a.dexMod, dex: a.dexMod, tie: 1 })),
    ...monsters.map((m, i) => ({ who: i, init: d20({}, rng).natural + m.dexMod, dex: m.dexMod, tie: 0 })),
  ];
  entries.sort((a, b) => b.init - a.init || b.dex - a.dex || b.tie - a.tie);
  // A Potion of Dexterity drunk before the fight is used up by it.
  const quick = !!player.effects?.dexterity;
  if (quick) player.effects = { ...player.effects, dexterity: false };
  // So is a Potion of Fire Resistance (Act 4, Sallow's): half fire damage to you for the fight.
  const fireResist = !!player.effects?.fireResist;
  if (fireResist) player.effects = { ...player.effects, fireResist: false };
  const battle = { player, ally, ally2, focus: 0, monsters, order: entries, turn: 0, round: 1, defending: false, quick, fireResist, state: "active", log: [], rewards: null, conditions: {},
    leadAlly: !!ally?.src.lead, leadAlly2: !!ally2?.src.lead, // you pick your companions' actions
    surviveRounds, allyFell: false, pending: null }; // pending: a reaction waiting for you (Iron Ward)
  const names = entries.map(e => (e.who === "player" ? "You" : isAllyKey(e.who) ? battle[e.who].name : monsters[e.who].name) + ` (${e.init})`);
  say(battle, "start", `${monsters.map(m => m.name).join(", ")} ${monsters.length > 1 ? "appear" : "appears"}! Initiative: ${names.join(", ")}.`);
  if (quick) say(battle, "quick", "Your Potion of Dexterity makes you quick: one extra attack each time you ATTACK.");
  // Thorne, faced with his old apprentice, can't move at first.
  const rachel = allies.find(a => a.id === "rachel");
  monsters.forEach((m, i) => {
    if (!m.hesitates || !rachel) return;
    addCondition(battle, i, "hesitant", { rounds: 1 });
    say(battle, "hesitate", `${rachel.name}: "Aldric. Stop." ${m.The} flinches, and for a moment he can't move.`, { who: i });
  });
  runMonsterTurns(battle, rng);
  return battle;
}

export const isPlayerTurn = battle => battle.state === "active" && !battle.pending && battle.order[battle.turn].who === "player";
/* A monster's blow would hit you and you know Iron Ward: the fight waits for reactAction(). */
export const isReacting = battle => battle.state === "active" && !!battle.pending;
/* A companion's turn, waiting for you to pick their action (only when you lead them). */
export const isAllyTurn = battle => battle.state === "active" && isAllyKey(battle.order[battle.turn].who);
/* Whose turn it is when it's a companion's: "ally" or "ally2", else null. */
export const allyTurnKey = battle => (isAllyTurn(battle) ? battle.order[battle.turn].who : null);
/* True if you pick this companion's actions. */
export const leads = (battle, key) => (key === "ally2" ? battle.leadAlly2 : battle.leadAlly);
/* Wounds go back to everyone's records once a fight is over. */
const settle = battle => afterBattle(battle.player, battle.ally, battle.ally2);

/* action: { type: "attack", target } | { type: "defend" } | { type: "potion", base } | { type: "flee" } | { type: "secondWind" }
   | { type: "actionSurge" } | { type: "allyPotion", on } (give a companion, "ally" unless `on` says "ally2", a Potion of
   Healing; it gets them back up if they've been knocked down) | { type: "runeStrike", target } | { type: "wardensCall" } | { type: "binding", target } | { type: "breakingRune" }
   (the Warden's runes: each spends a rune slot).
   A potion's base defaults to the Potion of Healing. */
export function playerAction(battle, action, rng = Math.random) {
  if (!isPlayerTurn(battle)) return { ok: false, reason: "It isn't your turn." };
  const start = battle.log.length;
  const p = battle.player;

  if (action.type === "attack" || action.type === "runeStrike" || action.type === "dawnstrike") {
    // Rune Strike (or the Oath of Dawn's Dawnstrike): an ATTACK whose first hit also burns a rune slot for radiant
    // damage (none spent on a miss).
    const dawn = action.type === "dawnstrike";
    let rune = action.type !== "attack";
    if (rune && !knowsRune(p, action.type)) return { ok: false, reason: "You don't know that rune." };
    if (rune && !runesLeft(p)) return { ok: false, reason: "No rune slots left. A long rest brings them back." };
    let target = battle.monsters[action.target ?? battle.monsters.indexOf(living(battle)[0])];
    if (!target || target.hp <= 0) return { ok: false, reason: "Pick a monster that's still standing." };
    battle.focus = battle.monsters.indexOf(target); // your companion shoots at the same one
    const atk = weaponAttack(p);
    for (let n = 0; n < attacksThisAction(battle) && target; n++) {
      const t = battle.monsters.indexOf(target);
      const swing = () => adjustRoll(resolveAttack(atk, acOf(battle, t), rng, { critOn: critOn(p), ...attackMods(battle, "player", t) }), target, atk);
      let r = swing();
      if (r.natural === 1 && !p.luckUsed && p.inventory.some(i => i.base === "luckyDie")) { // the Lucky Die, once per rest
        p.luckUsed = true;
        say(battle, "lucky", "A natural 1... but your Lucky Die tingles in your pack. You roll again!");
        r = swing();
      }
      let flare = "";
      if (rune && r.hit) {
        const dice = dawn ? "3d8" : target.type === "undead" ? "3d8" : "2d8";
        let extra = adjustDamage(target, roll(dice, rng).total, "radiant").damage;
        if (dawn && ["undead", "fiend"].includes(target.type)) extra *= 2; // the Dawn burns the dead
        r.damage += extra;
        p.runes.used = (p.runes.used || 0) + 1;
        rune = false;
        flare = dawn ? ` The Dawn blazes through your blade: +${extra} radiant!` : ` The rune on your blade flares: +${extra} radiant!`;
      }
      const woke = hurt(battle, t, r.damage);
      say(battle, "attack", `${n ? "Again! You swing" : "You swing"} your ${atk.name} at ${target.the}: ${rollText(r, atk.bonus)} ${hitText(r)}${flare}`, { roll: r, target: t, rune: !!flare });
      tellWoken(battle, t, woke);
      if (target.hp === 0) {
        say(battle, "defeat", `${target.The} falls.`, { target: t });
        target = living(battle)[0]; // the second attack goes to the next monster
      }
    }
    if (rune) say(battle, "rune-miss", "Your rune stays dark: no hit, no slot spent.");
  } else if (action.type === "wardensCall") {
    // Warden's Call: you and your companion heal, and shake off paralysis, fear and sleep (a fallen friend gets up).
    if (!knowsRune(p, "wardensCall")) return { ok: false, reason: "You don't know that rune." };
    if (!runesLeft(p)) return { ok: false, reason: "No rune slots left. A long rest brings them back." };
    p.runes.used = (p.runes.used || 0) + 1;
    say(battle, "call", "You raise the Wardenblade and call out: its rune rings like a bell across the field!");
    for (const key of partyKeys(battle)) {
      const c = combatant(battle, key), down = c.hp === 0;
      const healed = Math.min(c.maxHp - c.hp, roll("2d8", rng).total + p.level);
      c.hp += healed;
      const freed = CALL_ENDS.filter(id => battle.conditions?.[key]?.[id]);
      for (const id of freed) removeCondition(battle, key, id);
      say(battle, "call-heal", `${nameOf(battle, key)} ${key === "player" ? "recover" : "recovers"} ${healed} HP${down && healed ? " and gets back up" : ""}${freed.length ? `, no longer ${freed.map(id => CONDITIONS[id].name).join(" or ")}` : ""}.`, { who: key, heal: healed, revived: down && healed > 0 });
    }
  } else if (action.type === "chainLightning") {
    // The Oath of Storm: lightning leaps to every monster. A DEX save against your rune halves it.
    if (!knowsRune(p, "chainLightning")) return { ok: false, reason: "You don't know that rune." };
    if (!runesLeft(p)) return { ok: false, reason: "No rune slots left. A long rest brings them back." };
    p.runes.used = (p.runes.used || 0) + 1;
    say(battle, "chain", "You raise the Wardenblade, and lightning leaps from it, monster to monster!");
    const dc = runeDc(p);
    for (const m of living(battle)) {
      const t = battle.monsters.indexOf(m), s = battleSave(battle, t, "DEX", dc, rng), full = roll("6d8", rng).total;
      const dmg = adjustDamage(m, s.success ? Math.floor(full / 2) : full, "lightning").damage;
      const woke = hurt(battle, t, dmg);
      say(battle, "spell-save", `${m.The} ${s.success ? "dodges half of it" : "is caught"} (DEX save ${s.total} vs DC ${dc}): ${dmg} lightning damage.`, { target: t, save: s, damage: dmg });
      tellWoken(battle, t, woke);
      if (m.hp === 0) say(battle, "defeat", `${m.The} falls.`, { target: t });
    }
    const last = living(battle)[0];
    if (last && carries(p, "stormGlass")) { // the storm-glass rune stone: one more leap
      const t = battle.monsters.indexOf(last), s = battleSave(battle, t, "DEX", dc, rng), full = roll(STORM_GLASS, rng).total;
      const dmg = adjustDamage(last, s.success ? Math.floor(full / 2) : full, "lightning").damage;
      const woke = hurt(battle, t, dmg);
      say(battle, "spell-save", `The storm-glass rings, and the lightning leaps back to ${last.the} (DEX save ${s.total} vs DC ${dc}): ${dmg} lightning damage.`, { target: t, save: s, damage: dmg });
      tellWoken(battle, t, woke);
      if (last.hp === 0) say(battle, "defeat", `${last.The} falls.`, { target: t });
    }
  } else if (action.type === "breakingRune") {
    // The Breaking Rune (Act 4, from Matt): force, which nothing beyond the Door is immune to, on every monster.
    if (!knowsRune(p, "breakingRune")) return { ok: false, reason: "You don't know that rune." };
    if (!runesLeft(p)) return { ok: false, reason: "No rune slots left. A long rest brings them back." };
    p.runes.used = (p.runes.used || 0) + 1;
    say(battle, "breaking", "You strike the ground with the Wardenblade and speak the Breaking Rune: it hits like a hammer!");
    const dc = runeDc(p);
    for (const m of living(battle)) {
      const t = battle.monsters.indexOf(m), s = battleSave(battle, t, "DEX", dc, rng), full = roll("5d8", rng).total;
      const dmg = adjustDamage(m, s.success ? Math.floor(full / 2) : full, "force").damage;
      const woke = hurt(battle, t, dmg);
      say(battle, "spell-save", `${m.The} ${s.success ? "dodges half of it" : "takes it full on"} (DEX save ${s.total} vs DC ${dc}): ${dmg} force damage.`, { target: t, save: s, damage: dmg });
      tellWoken(battle, t, woke);
      if (m.hp === 0) say(battle, "defeat", `${m.The} falls.`, { target: t });
    }
  } else if (action.type === "binding") {
    // The Rune of Binding: a CON save against your rune, or the monster loses its next turn.
    if (!knowsRune(p, "binding")) return { ok: false, reason: "You don't know that rune." };
    if (!runesLeft(p)) return { ok: false, reason: "No rune slots left. A long rest brings them back." };
    const t = action.target ?? battle.monsters.indexOf(living(battle)[0]);
    if (!(battle.monsters[t]?.hp > 0)) return { ok: false, reason: "Pick a monster that's still standing." };
    p.runes.used = (p.runes.used || 0) + 1;
    const dc = runeDc(p), s = battleSave(battle, t, "CON", dc, rng), m = battle.monsters[t];
    if (s.success) say(battle, "spell-save", `Chains of light snap round ${m.the}, and it tears free (CON save ${s.total} vs DC ${dc}).`, { target: t, save: s, damage: 0 });
    else {
      addCondition(battle, t, "bound", { rounds: 1 });
      say(battle, "condition", `Chains of light lock round ${m.the}: it's bound and loses its next turn! (CON save ${s.total} vs DC ${dc})`, { who: t, condition: "bound" });
    }
  } else if (action.type === "defend") {
    battle.defending = true;
    say(battle, "defend", `You raise your guard (+${DEFEND_AC_BONUS} AC until your next turn).`);
  } else if (action.type === "potion") {
    const base = action.base || "potionHealing";
    const potion = p.inventory.find(i => i.base === base);
    if (!potion) return { ok: false, reason: base === "potionHealing" ? "You have no potions." : `You have no ${ITEMS[base]?.name ?? "potion like that"}.` };
    const b = baseOf(potion);
    if (b.effect === "speed") return { ok: false, reason: "A Potion of Speed is for travelling. Drink it from your bag." };
    if (b.effect === "homeward") return { ok: false, reason: "There's no flying home from the middle of a fight!" };
    if (b.effect === "dexterity" && battle.quick) return { ok: false, reason: "You're already as quick as you can be." };
    if (b.effect === "fireResist") return { ok: false, reason: "Drink that before a fight, from your bag." };
    const reason = cantDrink(p, potion);
    if (reason) return { ok: false, reason };
    const r = useItem(p, potion.uid, rng);
    if (r.effect === "dexterity") {
      p.effects = { ...p.effects, dexterity: false }; // used up by this fight
      battle.quick = true;
      say(battle, "quick", "You gulp down a Potion of Dexterity. From now on, every ATTACK is one attack more!");
    } else {
      say(battle, "potion", `You drink a ${b.name} and recover ${r.healed} HP (${p.hp}/${p.maxHp}).`, { heal: r.healed });
    }
  } else if (action.type === "allyPotion") {
    const key = action.on === "ally2" ? "ally2" : "ally", a = battle[key];
    if (!a) return { ok: false, reason: "No one is in your party." };
    const potion = p.inventory.find(i => i.base === "potionHealing");
    if (!potion) return { ok: false, reason: "You have no potions." };
    if (a.hp >= a.maxHp) return { ok: false, reason: `${a.name} is already at full health.` };
    p.inventory = p.inventory.filter(i => i !== potion);
    const down = a.hp === 0;
    const healed = Math.min(a.maxHp - a.hp, roll(baseOf(potion).heal, rng).total);
    a.hp += healed;
    say(battle, "ally-potion", `You give ${a.name} a ${baseOf(potion).name}. ${a.name} recovers ${healed} HP (${a.hp}/${a.maxHp})${down ? " and gets back up!" : "."}`, { who: key, heal: healed, revived: down });
  } else if (action.type === "secondWind") {
    if (!p.secondWind) return { ok: false, reason: "You've used your Second Wind. Rest to get it back." };
    if (p.hp >= p.maxHp) return { ok: false, reason: "You're already at full health." };
    p.secondWind = false;
    const healed = heal(p, roll(SECOND_WIND, rng).total + p.level);
    say(battle, "second-wind", `You catch your Second Wind and recover ${healed} HP (${p.hp}/${p.maxHp}). You can still act.`, { heal: healed });
    return { ok: true, events: battle.log.slice(start) }; // a bonus action: still your turn
  } else if (action.type === "actionSurge") {
    if (!hasFeature(p, "actionSurge")) return { ok: false, reason: "You learn Action Surge at level 2." };
    if (battle.surging) return { ok: false, reason: "You've already surged this turn." };
    if (!p.actionSurge) return { ok: false, reason: "You've used your Action Surge. Rest to get it back." };
    p.actionSurge = false;
    battle.surging = true;
    say(battle, "surge", "Action Surge! You push yourself: after this action, you get one more.");
    return { ok: true, events: battle.log.slice(start) }; // still your turn
  } else if (action.type === "flee") {
    const c = abilityCheck(p, "DEX", FLEE_DC, rng);
    if (c.success) {
      battle.state = "fled";
      settle(battle);
      say(battle, "fled", `You run for it (DEX ${c.total} vs DC ${FLEE_DC}) and get away.`);
      return { ok: true, events: battle.log.slice(start) };
    }
    say(battle, "flee-fail", `You try to run (DEX ${c.total} vs DC ${FLEE_DC}) but can't get clear.`);
  } else {
    return { ok: false, reason: `Unknown action: ${action.type}` };
  }

  return endPlayerAction(battle, start, rng);
}

/* After an action that uses your turn: the fight may be over; Action Surge may give you another action; otherwise
   your turn ends and everyone else's turns play out. Returns playerAction's result (rules/magic.js uses it too). */
export function endPlayerAction(battle, start, rng = Math.random) {
  if (!checkEnd(battle, rng)) {
    if (battle.surging) { // Action Surge: one more action before your turn ends
      battle.surging = false;
      say(battle, "surge-again", "Your surge carries you on: act again!");
      return { ok: true, events: battle.log.slice(start) };
    }
    finishTurn(battle, "player", rng);
    nextTurn(battle);
    runMonsterTurns(battle, rng);
  }
  return { ok: true, events: battle.log.slice(start) };
}

/* After a companion's action (when you lead them): the fight may be over; otherwise their turn ends and play
   moves on. */
export function endAllyAction(battle, start, rng = Math.random) {
  const key = battle.order[battle.turn].who;
  if (!checkEnd(battle, rng)) {
    finishTurn(battle, key, rng);
    nextTurn(battle);
    runMonsterTurns(battle, rng);
  }
  return { ok: true, events: battle.log.slice(start) };
}

/* Attacks in one ATTACK action: one, two with Extra Attack, and one more with a Potion of Dexterity. */
export const attacksThisAction = battle => attacksPerAction(battle.player) + (battle.quick ? 1 : 0);

const isAre = key => (key === "player" ? "are" : "is");

/* The end of someone's turn: their conditions count down, and they may save their way out of one. */
function finishTurn(battle, key, rng) {
  for (const e of endTurn(battle, key, ability => saveBonusOf(battle, key, ability), rng)) {
    const how = e.save ? ` (${e.save.ability} save ${e.save.total} vs DC ${e.save.dc})` : "";
    say(battle, "condition-end", `${nameOf(battle, key)} ${isAre(key)} no longer ${e.name}${how}.`, { who: key });
  }
}

/* Plays everyone else's turns (your companions' and the monsters') until it is yours again or the fight is over.
   Anyone whose conditions take their turn away (asleep, paralyzed) just has their conditions tick on, you included. */
function runMonsterTurns(battle, rng) {
  while (battle.state === "active") {
    if (checkEnd(battle, rng)) return; // a trial's monsters may have crumbled at the turn of the round
    const key = battle.order[battle.turn].who;
    if (combatant(battle, key).hp > 0) {
      for (const name of startTurn(battle, key)) say(battle, "condition-end", `${nameOf(battle, key)} ${isAre(key)} no longer ${name}.`, { who: key });
      if (typeof key === "number") { regenerate(battle, key); linger(battle, key, rng); }
      if (battle.pack?.by === key) packBites(battle, rng);
      if (checkEnd(battle, rng)) return;
      if (combatant(battle, key).hp <= 0) { nextTurn(battle); continue; } // burned away before it could act
      if (skipsTurn(battle, key)) {
        const why = Object.keys(battle.conditions[key]).filter(id => CONDITIONS[id].skips).map(id => CONDITIONS[id].name).join(" and ");
        say(battle, "skip", `${nameOf(battle, key)} ${isAre(key)} ${why} and can't act.`, { who: key });
        finishTurn(battle, key, rng);
      } else if (key === "player" || (isAllyKey(key) && leads(battle, key))) { // your turn, or one you lead
        if (key === "player") dawnLight(battle, rng);
        break;
      }
      else {
        if (isAllyKey(key)) allyTurn(battle, rng, key);
        else if (monsterTurn(battle, key, rng)) return; // a blow is waiting on your Iron Ward
        if (checkEnd(battle, rng)) return;
        finishTurn(battle, key, rng);
      }
    }
    nextTurn(battle);
  }
  if (battle.state === "active") battle.defending = false; // the guard lasts until the start of the player's turn
}

/* The Oath of Dawn: a little healing light for you and your companions at the start of your turn, when you're hurt. */
function dawnLight(battle, rng) {
  if (oathOf(battle) !== "dawn") return;
  for (const key of partyKeys(battle)) {
    const c = combatant(battle, key);
    if (!c || c.hp <= 0 || c.hp >= c.maxHp) continue;
    const light = roll(DAWN_AURA, rng).total + (carries(battle.player, "dawnBanner") ? roll(DAWN_AURA, rng).total : 0);
    const healed = Math.min(c.maxHp - c.hp, light);
    c.hp += healed;
    say(battle, "dawn-light", `The Dawn's light warms ${key === "player" ? "you" : c.name}: +${healed} HP.`, { who: key, heal: healed });
  }
}

/* True if this condition can't touch them (the Oath of Dawn: no fear). */
export const immuneTo = (battle, key, id) => key === "player" && id === "frightened" && oathOf(battle) === "dawn";

/* A troll's regeneration, at the start of its turn: back up by `regen.hp`, unless it took fire (or whatever stops it)
   since its last turn. */
function regenerate(battle, i) {
  const m = battle.monsters[i];
  if (!m.regen || m.hp <= 0) return;
  if (m.regenBlocked) { m.regenBlocked = false; return say(battle, "regen-stop", `${m.The}'s burns don't knit.`, { target: i }); }
  const healed = Math.min(m.maxHp - m.hp, m.regen.hp);
  if (!healed) return;
  m.hp += healed;
  say(battle, "regen", `${m.The}'s wounds knit closed before your eyes (+${healed} HP). Fire would stop that.`, { target: i, heal: healed });
}

/* Moonbeam and Call Lightning keep hurting whoever they're on, at the start of each of its turns (a save halves it). */
function linger(battle, i, rng) {
  const m = battle.monsters[i];
  for (const [id, c] of Object.entries(battle.conditions?.[i] || {})) {
    if (!CONDITIONS[id].lingering || m.hp <= 0) continue;
    const s = battleSave(battle, i, c.save, c.dc, rng), full = roll(c.damage, rng).total;
    const dmg = adjustDamage(m, s.success ? Math.floor(full / 2) : full, c.damageType).damage;
    const woke = hurt(battle, i, dmg);
    say(battle, "linger", `${CONDITIONS[id].burns} ${m.the}: ${dmg} ${c.damageType} damage (${c.save} save ${s.total} vs DC ${c.dc}${s.success ? ", halved" : ""}).`, { target: i, damage: dmg });
    tellWoken(battle, i, woke);
    if (m.hp === 0) say(battle, "defeat", `${m.The} falls.`, { target: i });
  }
}

/* The summoned wolf pack: at the start of its summoner's turn, a bite at every monster standing, for its rounds. */
function packBites(battle, rng) {
  const p = battle.pack;
  p.rounds--;
  say(battle, "pack", p.rounds ? "The wolf pack harries your foes!" : "The wolf pack makes one last rush, then melts back into the trees.", { by: p.by });
  for (const m of living(battle)) {
    const t = battle.monsters.indexOf(m), r = adjustRoll(resolveAttack(p.attack, acOf(battle, t), rng), m, p.attack);
    const woke = hurt(battle, t, r.damage);
    say(battle, "pack-bite", `A wolf bites ${m.the}: ${rollText(r, p.attack.bonus)} ${hitText(r)}`, { roll: r, target: t });
    tellWoken(battle, t, woke);
    if (m.hp === 0) say(battle, "defeat", `${m.The} falls.`, { target: t });
  }
  if (!p.rounds) battle.pack = null;
}

/* True if you could turn this blow aside with Iron Ward: you know it, have a slot, can act, and +5 AC is enough. */
function canWard(battle, r) {
  const p = battle.player;
  const free = oathOf(battle) === "iron" && !battle.freeWardUsed; // the Oath of Iron: one free Iron Ward a fight
  return knowsRune(p, "ironWard") && (runesLeft(p) > 0 || free) && !skipsTurn(battle, "player") && !r.crit && r.total < r.targetAc + IRON_WARD_AC;
}

/* Who a monster goes for: you, or a companion who's still standing, all equally likely. */
function pickTarget(battle, rng) {
  const up = allyKeys(battle).filter(k => battle[k].hp > 0);
  if (!up.length) return "player";
  const n = Math.floor(rng() * (up.length + 1));
  return n < up.length ? up[n] : "player";
}

/* A companion has been knocked down. */
function allyDown(battle, key) {
  const a = battle[key];
  battle.allyFell = true;
  say(battle, "ally-down", `${a.name} is knocked down! ${a.name} will be back up after the fight.`, { who: key });
}

/* A monster's turn: each of its attacks (from attack number `from`), at one of you (pickTarget; `targetChoice` carries
   that choice over when its turn resumes). An attack with `onHit` ({ condition,
   save, dc, rounds }) makes whoever it hits save or take that condition, with a save at the end of each of their turns
   to shake it off (the ghoul's paralysing claws); one with `poison` ({ save, dc, damage }) does extra damage, halved on
   a save (the wyvern's sting). A blow that would hit you, when Iron Ward could stop it, pauses the fight for your
   reaction: returns true then (battle.pending says which blow). */
function monsterTurn(battle, i, rng, from = 0, targetChoice = null) {
  const m = battle.monsters[i];
  if (from === 0 && targetChoice === null) { // a spell instead of its attacks, which Rachel may COUNTER
    const cast = monsterCasts(battle, i, rng);
    if (cast) return cast === "paused";
  }
  const key = targetChoice ?? pickTarget(battle, rng);
  for (let n = from; n < m.attacks.length; n++) {
    if (combatant(battle, key).hp <= 0) break;
    const atk = m.attacks[n];
    const r = resolveAttack(atk, acOf(battle, key), rng, attackMods(battle, i, key));
    if (key === "player" && r.hit && oathOf(battle) === "storm" && !battle.blinked) { // the Oath of Storm: Blink
      battle.blinked = true;
      Object.assign(r, { hit: false, crit: false, damage: 0 });
      say(battle, "blink", `You BLINK, a step sideways through the air: ${m.the}'s ${atk.name} finds nothing.`, { actor: i });
    }
    if (key === "player" && r.hit && canWard(battle, r)) {
      battle.pending = { kind: "ironWard", monster: i, attack: n, target: key, roll: r };
      say(battle, "ward-prompt", `${m.The}'s ${atk.name} is going to hit you (${r.total} vs AC ${r.targetAc})! Iron Ward? (+${IRON_WARD_AC} AC, a rune slot)`, { actor: i });
      return true;
    }
    landAttack(battle, i, key, atk, r, rng);
  }
  if (isAllyKey(key) && battle[key].hp === 0) allyDown(battle, key);
  return false;
}

/* A monster with spells may cast one instead of attacking: the first with uses left whose `chance` comes up. Returns
   false if it doesn't, true if it cast, or "paused" if Rachel could COUNTER it (battle.pending waits for reactAction). */
function monsterCasts(battle, i, rng) {
  const m = battle.monsters[i];
  const spell = (m.spells || []).find(sp => m.spellsLeft[sp.name] > 0 && rng() < sp.chance);
  if (!spell) return false;
  m.spellsLeft[spell.name]--;
  if (!spell.breath && canCounter(battle)) {
    battle.pending = { kind: "counter", monster: i, spell };
    say(battle, "counter-prompt", `${m.The} begins to cast ${spell.name}! ${battle[counterKey(battle)].name} could COUNTER it (a level 3 slot).`, { actor: i });
    return "paused";
  }
  castMonsterSpell(battle, i, spell, rng);
  return true;
}

/* A monster's spell: everyone it touches makes a saving throw (you with Indomitable and Pip's badge), for damage
   (halved on a save, if `half`) and maybe a condition. */
export function castMonsterSpell(battle, i, spell, rng) {
  const m = battle.monsters[i];
  say(battle, "monster-cast", `${m.The} casts ${spell.name}!`, { actor: i, spell: spell.name });
  const keys = spell.targets === "all" ? ["player", ...allyKeys(battle).filter(k => battle[k].hp > 0)] : [pickTarget(battle, rng)];
  for (const key of keys) {
    const s = key === "player" ? resistSave(battle, key, spell.save, spell.dc, rng) : battleSave(battle, key, spell.save, spell.dc, rng, { advantage: !!combatant(battle, key).resistsMagic });
    const full = spell.damage ? roll(spell.damage, rng).total : 0;
    let dmg = s.success ? (spell.half ? Math.floor(full / 2) : 0) : full;
    if (key === "player" && spell.damageType === "fire" && fireproof(battle)) dmg = Math.floor(dmg / 2);
    const woke = hurt(battle, key, dmg);
    const who = nameOf(battle, key), are = key === "player" ? "are" : "is";
    say(battle, "monster-spell", `${who} ${s.success ? (key === "player" ? "resist" : "resists") : (key === "player" ? "are caught" : "is caught")} (${spell.save} save ${s.total} vs DC ${spell.dc})${dmg ? `: ${dmg} ${spell.damageType} damage` : ""}.`, { who: key, damage: dmg });
    tellWoken(battle, key, woke);
    if (!s.success && spell.condition && combatant(battle, key).hp > 0 && !immuneTo(battle, key, spell.condition.id)) {
      addCondition(battle, key, spell.condition.id, { rounds: spell.condition.rounds });
      say(battle, "condition", `${who} ${are} ${CONDITIONS[spell.condition.id].name}!`, { who: key, condition: spell.condition.id });
    }
    if (isAllyKey(key) && battle[key].hp === 0) allyDown(battle, key);
  }
}

/* One monster attack landing (or missing), with what it does after. */
function landAttack(battle, i, key, atk, r, rng) {
  const m = battle.monsters[i], a = combatant(battle, key);
  if (r.hit && oathOf(battle) === "iron") {
    if (key === "player") r.damage = Math.max(0, r.damage - IRON_SKIN); // heavy armour mastery
    else if (battle.player.hp > 0) r.damage = Math.floor(r.damage / 2); // Shield Ally: you cover your companion
  }
  if (r.hit && key === "player" && atk.damageType === "fire" && fireproof(battle)) r.damage = Math.floor(r.damage / 2);
  const woke = hurt(battle, key, r.damage);
  if (isAllyKey(key)) say(battle, "monster-attack", `${m.The} attacks ${a.name} with its ${atk.name}: ${rollText(r, atk.bonus)} ${hitText(r)}`, { roll: r, actor: i, onAlly: true, who: key });
  else say(battle, "monster-attack", `${m.The} attacks with its ${atk.name}: ${rollText(r, atk.bonus)} ${hitText(r, true)}`, { roll: r, actor: i, who: key });
  tellWoken(battle, key, woke);
  if (r.hit && atk.poison && combatant(battle, key).hp > 0) {
    const { save, dc, damage } = atk.poison, s = resistSave(battle, key, save, dc, rng), full = roll(damage, rng).total;
    const dmg = s.success ? Math.floor(full / 2) : full;
    hurt(battle, key, dmg);
    say(battle, "poison", `Poison burns through ${key === "player" ? "you" : a.name}: ${dmg} damage (${save} save ${s.total} vs DC ${dc}${s.success ? ", halved" : ""}).`, { who: key, damage: dmg });
  }
  if (r.hit && atk.onHit && combatant(battle, key).hp > 0) afflict(battle, key, atk.onHit, rng);
}

/* Your answer to a reaction prompt: `use` it or not. Iron Ward (a blow that would hit you): a rune slot for +5 AC
   against it, so it misses, or take the hit; the monster's turn then carries on. COUNTER (a monster starting a spell):
   Rachel spends a slot to stop it, or lets it go off; either way that's the monster's turn. Returns { ok, events } like
   playerAction. */
export function reactAction(battle, useWard, rng = Math.random) {
  const pend = battle.pending;
  if (!isReacting(battle)) return { ok: false, reason: "There's nothing to react to." };
  if (pend.kind === "counter") {
    const start = battle.log.length;
    battle.pending = null;
    if (!useWard || !counter(battle, pend.spell, rng)) castMonsterSpell(battle, pend.monster, pend.spell, rng);
    if (!checkEnd(battle, rng)) {
      finishTurn(battle, pend.monster, rng);
      nextTurn(battle);
      runMonsterTurns(battle, rng);
    }
    return { ok: true, events: battle.log.slice(start) };
  }
  const start = battle.log.length, p = battle.player, m = battle.monsters[pend.monster], atk = m.attacks[pend.attack], r = pend.roll;
  battle.pending = null;
  if (useWard) {
    if (oathOf(battle) === "iron" && !battle.freeWardUsed) battle.freeWardUsed = true; // free, once a fight
    else p.runes.used = (p.runes.used || 0) + 1;
    say(battle, "ward", `Iron Ward! The rune on your blade flares, and ${m.the}'s ${atk.name} glances off (${r.total} vs AC ${r.targetAc + IRON_WARD_AC}).`, { actor: pend.monster });
  } else landAttack(battle, pend.monster, "player", atk, r, rng);
  if (!monsterTurn(battle, pend.monster, rng, pend.attack + 1, pend.target) && !checkEnd(battle, rng)) {
    finishTurn(battle, pend.monster, rng);
    nextTurn(battle);
    runMonsterTurns(battle, rng);
  }
  return { ok: true, events: battle.log.slice(start) };
}

/* An attack's lingering effect: a saving throw, or the condition. */
function afflict(battle, key, { condition, save, dc, rounds }, rng) {
  if (immuneTo(battle, key, condition)) return say(battle, "save", "The Dawn steadies you: fear can't take hold.", { who: key });
  const s = resistSave(battle, key, save, dc, rng);
  const who = nameOf(battle, key), are = key === "player" ? "are" : "is";
  if (s.success) return say(battle, "save", `${who} shake${key === "player" ? "" : "s"} it off (${save} save ${s.total} vs DC ${dc}).`, { who: key });
  addCondition(battle, key, condition, { rounds, saveEnds: { ability: save, dc } });
  say(battle, "condition", `${who} ${are} ${CONDITIONS[condition].name}! (${save} save ${s.total} vs DC ${dc})`, { who: key, condition });
}

/* Each monster's loot table is rolled separately. */
export function rollLoot(monsters, rng = Math.random) {
  const found = [];
  for (const m of monsters) for (const l of MONSTERS[m.id].loot || []) if (rng() < l.chance) found.push(makeItem(l.base, { upgrade: l.upgrade || 0 }));
  return found;
}

function nextTurn(battle) {
  battle.turn++;
  if (battle.turn >= battle.order.length) {
    battle.turn = 0;
    battle.round++;
    // A waystone's trial: hold out long enough, and the stone's power breaks whatever's left.
    if (battle.surviveRounds && battle.round > battle.surviveRounds && living(battle).length) {
      for (const m of living(battle)) m.hp = 0;
      say(battle, "survived", `You've held the stone for ${battle.surviveRounds} rounds! It blazes white, and your foes crumble to dust.`);
    }
  }
}

export function checkEnd(battle, rng) {
  const p = battle.player;
  if (p.hp <= 0 && p.oath === "iron" && !p.unbrokenUsed) { // the Oath of Iron: Unbroken, once per long rest
    p.unbrokenUsed = true;
    p.hp = 1;
    say(battle, "unbroken", "You fall... and you don't. UNBROKEN! You stand up out of the blow with 1 HP.");
  }
  if (battle.player.hp <= 0) {
    battle.state = "lost";
    settle(battle);
    say(battle, "lost", "You fall to the ground. Darkness takes you.");
    return true;
  }
  if (living(battle).length === 0) {
    battle.state = "won";
    settle(battle);
    const xp = battle.monsters.reduce((s, m) => s + m.xp, 0);
    const gold = battle.monsters.reduce((s, m) => s + roll(m.gold, rng).total, 0);
    battle.player.gold += gold;
    const loot = rollLoot(battle.monsters, rng);
    battle.player.inventory.push(...loot);
    const { levelUps } = gainXp(battle.player, xp, rng);
    battle.rewards = { xp, gold, levelUps, loot: loot.map(itemName) };
    say(battle, "won", `Victory! You gain ${xp} XP and ${gold} gold.`);
    for (const name of battle.rewards.loot) say(battle, "loot", `You find a ${name}.`);
    for (const l of levelUps) {
      const news = [...l.features, ...(l.asi ? ["an ability score increase"] : [])];
      say(battle, "level-up", `You reach level ${l.level}! +${l.hpGain} max HP.${news.length ? ` New: ${news.join(", ")}.` : ""}`, { level: l.level });
      for (const key of allyKeys(battle)) say(battle, "ally-level-up", `${battle[key].name} reaches level ${l.level} too!`, { who: key });
    }
    return true;
  }
  return false;
}

/* Each log entry carries everyone's HP right after it happened, so a screen can play the fight back step by step.
   extra: roll (an attack roll), target / actor (monster index), heal (HP recovered), onAlly (a monster hit your companion). */
export function say(battle, type, text, extra = {}) {
  const form = a => (a?.form ? { id: a.form.id, hp: a.form.hp, maxHp: a.form.maxHp } : null); // Wild Shape's beast
  const hp = { player: battle.player.hp, ally: battle.ally ? battle.ally.hp : null, ally2: battle.ally2 ? battle.ally2.hp : null, monsters: battle.monsters.map(m => m.hp),
    forms: { ally: form(battle.ally), ally2: form(battle.ally2) } };
  battle.log.push({ round: battle.round, type, text, hp, level: battle.player.level, ...extra });
}

export const rollText = (r, bonus) => `${r.natural} ${bonus < 0 ? "-" : "+"} ${Math.abs(bonus)}${r.extra ? ` + ${r.extra}` : ""} = ${r.total} vs AC ${r.targetAc}.`;
export const hitText = (r, onYou) =>
  !r.hit ? "Miss." : `${r.crit ? "Critical hit!" : "Hit!"} ${r.damage} damage${onYou ? " to you" : ""}${NOTES[r.note] || ""}.`;
const NOTES = { weak: " (it's weak to that!)", resists: " (it shrugs off half)", immune: " (it doesn't even notice)" };
