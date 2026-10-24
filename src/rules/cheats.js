// Cheat codes, typed on the title screen's CHEATS page. A right code asks how much to add, then adds it; the "fight"
// one goes straight into a test fight with a second companion beside you (Act 4's two-companion battles).
import { gainXp } from "./character.js";

export const CHEATS = {
  notallwisdomisearned: { kind: "xp", label: "XP" },
  notallthatglitters: { kind: "gold", label: "GOLD" },
  strengthinnumbers: { kind: "fight", label: "FIGHT" },
};
export const MAX_CHEAT_AMOUNT = 9_999_999;

/* The cheat a code unlocks, or null. Case and spaces don't matter. */
export const cheatFor = code => CHEATS[String(code).toLowerCase().replace(/\s+/g, "")] || null;

/* The test fight: monsters about right for your level, and a second companion (as a guest, or from your roster) who
   isn't the one travelling with you. Returns Battle scene data. */
export function cheatFight(hero) {
  const second = ["rachel", "robyn", "megan"].find(id => id !== hero.companion?.id);
  const foes = hero.level >= 9 ? ["troll", "griffon"] : hero.level >= 5 ? ["ghoul", "lizardfolk"] : ["goblin", "wolf"];
  return { foes, second, zone: "keep" };
}

/* Adds amount XP (levelling up as gainXp does) or gold to the hero. { ok, reason } or { ok, kind, amount, levelUps }. */
export function applyCheat(char, kind, amount, rng = Math.random) {
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_CHEAT_AMOUNT) {
    return { ok: false, reason: `Enter a whole number from 1 to ${MAX_CHEAT_AMOUNT}.` };
  }
  if (kind === "xp") return { ok: true, kind, amount, levelUps: gainXp(char, amount, rng).levelUps };
  if (kind === "gold") { char.gold += amount; return { ok: true, kind, amount, levelUps: [] }; }
  return { ok: false, reason: `Unknown cheat: ${kind}` };
}
