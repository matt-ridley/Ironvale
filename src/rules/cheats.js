// Cheat codes, typed on the title screen's CHEATS page. A right code asks how much to add, then adds it.
import { gainXp } from "./character.js";

export const CHEATS = {
  notallwisdomisearned: { kind: "xp", label: "XP" },
  notallthatglitters: { kind: "gold", label: "GOLD" },
};
export const MAX_CHEAT_AMOUNT = 9_999_999;

/* The cheat a code unlocks, or null. Case and spaces don't matter. */
export const cheatFor = code => CHEATS[String(code).toLowerCase().replace(/\s+/g, "")] || null;

/* Adds amount XP (levelling up as gainXp does) or gold to the hero. { ok, reason } or { ok, kind, amount, levelUps }. */
export function applyCheat(char, kind, amount, rng = Math.random) {
  if (!Number.isInteger(amount) || amount < 1 || amount > MAX_CHEAT_AMOUNT) {
    return { ok: false, reason: `Enter a whole number from 1 to ${MAX_CHEAT_AMOUNT}.` };
  }
  if (kind === "xp") return { ok: true, kind, amount, levelUps: gainXp(char, amount, rng).levelUps };
  if (kind === "gold") { char.gold += amount; return { ok: true, kind, amount, levelUps: [] }; }
  return { ok: false, reason: `Unknown cheat: ${kind}` };
}
