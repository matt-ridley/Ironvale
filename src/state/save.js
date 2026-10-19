// Saving and loading the game state in the browser's localStorage. The game saves itself (after each step, when a
// menu or battle ends, and when the app is hidden), so there is no save button.
// Loading is careful: anything unknown (an item removed in an update, a position that is now a wall) is dropped or
// reset rather than breaking the game.
import { VERSION } from "../config.js";
import { ITEMS } from "../data/items.js";
import { SLOTS } from "../rules/items.js";
import { COMPANIONS, COMPANION_SLOTS, startingGear } from "../rules/party.js";
import { MAPS } from "../world/maps.js";
import { blockedAt, feetAt } from "../world/movement.js";
import { OVERWORLD } from "../world/overworld.js";

export const SAVE_KEY = "ironvale-save";
export const SAVE_FORMAT = 2;
// Format 1 (before 0.7.0) saved whole tiles; format 2 saves the hero's feet in fractions of a tile.
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
  return { id: c.id, hurt: isInt(c.hurt) && c.hurt > 0 ? c.hurt : 0, gear };
}

/* Parses a save. Returns the game state, or null if it isn't a save this game can use. */
export function deserialize(json) {
  let data;
  try { data = JSON.parse(json); } catch { return null; }
  if (!data || ![1, SAVE_FORMAT].includes(data.format) || !data.state?.hero) return null;
  const s = data.state, h = s.hero;
  if (!h.abilities || !["STR", "DEX", "CON"].every(a => isInt(h.abilities[a]))) return null;
  for (const k of ["level", "xp", "gold", "maxHp", "hp"]) if (!isInt(h[k])) return null;

  const hero = {
    ...h,
    hp: Math.min(Math.max(h.hp, 1), h.maxHp), // never load into a fight-ending 0
    bank: isInt(h.bank) && h.bank > 0 ? h.bank : 0, // saves from before 0.9.0 have no bank
    companion: loadCompanion(h.companion),
    secondWind: h.secondWind !== false,
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
