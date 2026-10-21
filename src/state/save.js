// Saving and loading the game state in the browser's localStorage. The game saves itself (after each step, when a
// menu or battle ends, and when the app is hidden), so there is no save button.
// Loading is careful: anything unknown (an item removed in an update, a position that is now a wall) is dropped or
// reset rather than breaking the game.
import { VERSION } from "../config.js";
import { ITEMS } from "../data/items.js";
import { SLOTS } from "../rules/items.js";
import { COMPANIONS, COMPANION_SLOTS, startingGear, tacticsFor } from "../rules/party.js";
import { MAPS } from "../world/maps.js";
import { blockedAt, feetAt } from "../world/movement.js";
import { OVERWORLD } from "../world/overworld.js";
import { cleanBestiary } from "../rules/bestiary.js";
import { hubById } from "../world/travel.js";
import { asiEarned, RUNES, FIGHTING_STYLES } from "../rules/character.js";
import { cleanName } from "../story/hero.js";
import { cleanBounty } from "../story/bounties.js";
import { SPELLS } from "../data/spells.js";

export const SAVE_KEY = "ironvale-save";
export const SAVE_FORMAT = 6;
// Format 1 (before 0.7.0) saved whole tiles; format 2 saves the hero's feet in fractions of a tile; format 3 (0.18.0)
// adds lastHub, the town you wake in when you faint. Older saves get Oakhollow. Format 4 (0.19.0) adds the fighter's
// Action Surge and ability score increases: a hero saved at level 4 or higher before then gets theirs to pick.
// Format 5 (0.22.0) gives the hero's starting sword its crest: older saves put it on their first longsword.
// Format 6 (0.31.0) adds Act 3's: how many campfire talks each companion has told (`talks`), the fighting style picked
// at level 10 and Indomitable. Older saves have heard no talks and have Indomitable ready.
const DIR_NAMES = ["up", "down", "left", "right"];

export function serialize(state) {
  return JSON.stringify({ format: SAVE_FORMAT, version: VERSION, savedAt: Date.now(), state });
}

const isInt = n => Number.isInteger(n);
const knownItem = i => i && typeof i === "object" && ITEMS[i.base] && isInt(i.upgrade) && typeof i.uid === "string";

/* A companion the game no longer knows is dropped. Saves from 0.10.0 have no gear: they get the starting gear. */
function loadCompanion(c) {
  if (!COMPANIONS[c?.id]) return undefined;
  const fits = { bow: b => b.type === "bow", armour: b => b.type === "armour" && b.category === "light" };
  const gear = c.gear && typeof c.gear === "object"
    ? Object.fromEntries(COMPANION_SLOTS.map(s => { const i = c.gear[s]; return [s, knownItem(i) && fits[s](ITEMS[i.base]) ? i : null]; }))
    : startingGear(c.id);
  const extra = {
    ...(Array.isArray(c.slotsUsed) && { slotsUsed: c.slotsUsed.map(n => (isInt(n) && n > 0 ? n : 0)) }), // a caster's spent slots
    ...(tacticsFor(c.id).includes(c.tactics) && { tactics: c.tactics }),
    ...(c.lead === true && { lead: true }), // you pick their actions in a fight
    ...(isInt(c.talks) && c.talks > 0 && { talks: c.talks }), // campfire talks heard (story/talks.js)
    ...(Array.isArray(c.spells) && { spells: c.spells.filter(id => SPELLS[id]) }), // a wizard's spellbook
    ...(c.recovered === true && { recovered: true }), // Arcane Recovery, used since the last long rest
  };
  return { id: c.id, hurt: isInt(c.hurt) && c.hurt > 0 ? c.hurt : 0, gear, ...extra };
}

/* Parses a save. Returns the game state, or null if it isn't a save this game can use. */
export function deserialize(json) {
  let data;
  try { data = JSON.parse(json); } catch { return null; }
  if (!data || ![1, 2, 3, 4, 5, SAVE_FORMAT].includes(data.format) || !data.state?.hero) return null;
  const s = data.state, h = s.hero;
  if (!h.abilities || !["STR", "DEX", "CON"].every(a => isInt(h.abilities[a]))) return null;
  for (const k of ["level", "xp", "gold", "maxHp", "hp"]) if (!isInt(h[k])) return null;

  const hero = {
    ...h,
    hp: Math.min(Math.max(h.hp, 1), h.maxHp), // never load into a fight-ending 0
    bank: isInt(h.bank) && h.bank > 0 ? h.bank : 0, // saves from before 0.9.0 have no bank
    companion: loadCompanion(h.companion),
    secondWind: h.secondWind !== false,
    actionSurge: h.actionSurge !== false,
    ...(Array.isArray(h.runes?.known) && { runes: { known: h.runes.known.filter(id => RUNES[id]), used: isInt(h.runes.used) && h.runes.used > 0 ? h.runes.used : 0 } }),
    asi: data.format < 4 ? asiEarned(h.level) : isInt(h.asi) && h.asi > 0 ? h.asi : 0,
    equipment: Object.fromEntries(SLOTS.map(slot => {
      const item = h.equipment?.[slot];
      return [slot, knownItem(item) && ITEMS[item.base].type === slot ? item : null];
    })),
    inventory: Array.isArray(h.inventory) ? h.inventory.filter(knownItem) : [],
    effects: { // saves from before 0.8.0 have none
      speed: isInt(h.effects?.speed) && h.effects.speed > 0 ? h.effects.speed : 0,
      dexterity: h.effects?.dexterity === true,
    },
  };
  if (!hero.companion) delete hero.companion;
  if (!FIGHTING_STYLES[hero.fightingStyle]) delete hero.fightingStyle;
  if (typeof hero.indomitableUsed !== "boolean") delete hero.indomitableUsed;
  hero.name = cleanName(h.name);
  if (data.format < 5) { // the crest goes on the sword you've had longest: your first longsword, worn or carried
    const all = [hero.equipment.weapon, ...hero.inventory].filter(Boolean);
    const sword = !all.some(i => i.crest) && all.find(i => i.base === "longsword");
    if (sword) sword.crest = true;
  }
  // Companions waiting at an inn (saves from before 0.21.0 have none). One that's also in the party is dropped.
  const roster = [];
  for (const c of Array.isArray(h.roster) ? h.roster.map(loadCompanion) : []) {
    if (c && c.id !== hero.companion?.id && !roster.some(r => r.id === c.id)) roster.push(c);
  }
  if (roster.length) hero.roster = roster; else delete hero.roster;
  const flags = s.flags && typeof s.flags === "object" ? { ...s.flags } : {};
  // Saves from before 0.8.0 have no map: they're on the overworld. A map this game doesn't know means start over.
  let map = s.map === undefined ? OVERWORLD.name : MAPS[s.map] ? s.map : null;
  let pos = map && s.pos && Number.isFinite(s.pos.x) && Number.isFinite(s.pos.y) ? { x: s.pos.x, y: s.pos.y } : null;
  if (pos && data.format === 1) pos = feetAt(pos.x, pos.y);
  if (!pos || blockedAt(MAPS[map], pos.x, pos.y, flags)) { map = OVERWORLD.name; pos = feetAt(OVERWORLD.spawn.x, OVERWORLD.spawn.y); }
  return {
    hero,
    map,
    pos,
    facing: DIR_NAMES.includes(s.facing) ? s.facing : "down",
    stepsSinceFight: isInt(s.stepsSinceFight) ? s.stepsSinceFight : 0,
    flags,
    bestiary: cleanBestiary(s.bestiary), // saves from before 0.16.0 have none
    lastHub: hubById(s.lastHub).id, // saves from before 0.18.0 (and unknown towns) get Oakhollow
    ...(cleanBounty(s.bounty) && { bounty: cleanBounty(s.bounty) }), // a hunt from the bounty board
  };
}

/* localStorage can be missing or throw (private browsing, storage full, blocked), so every call is guarded. */
const defaultStorage = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export function saveGame(state, storage = defaultStorage()) {
  try { storage?.setItem(SAVE_KEY, serialize(state)); return !!storage; } catch { return false; }
}

export function loadGame(storage = defaultStorage()) {
  try { const json = storage?.getItem(SAVE_KEY); return json ? deserialize(json) : null; } catch { return null; }
}

export function deleteSave(storage = defaultStorage()) {
  try { storage?.removeItem(SAVE_KEY); } catch { /* nothing to delete */ }
}
