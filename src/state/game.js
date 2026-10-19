// The one game state every scene shares: the hero, where they are, and quest progress. save.js writes it out.
import { createCharacter, rest } from "../rules/character.js";
import { OVERWORLD } from "../world/overworld.js";
import { saveGame, loadGame } from "./save.js";
import { feetAt } from "../world/movement.js";

export const state = {};

export function newGame() {
  state.hero = createCharacter();
  state.map = OVERWORLD.name;
  state.pos = feetAt(OVERWORLD.spawn.x, OVERWORLD.spawn.y); // in tiles, at the hero's feet
  state.facing = "down";
  state.stepsSinceFight = 0;
  state.flags = {}; // quest progress, e.g. questStarted, logCleared, chiefDefeated, questRewarded
}

export const FAINT_MAX_LOSS = 50;

/* Losing a fight isn't the end: you wake in the village, rested, but half the gold you carry is gone (never more
   than FAINT_MAX_LOSS). Gold in the bank is safe. */
export function faint() {
  const lost = Math.min(Math.floor(state.hero.gold / 2), FAINT_MAX_LOSS);
  state.hero.gold -= lost;
  rest(state.hero);
  state.map = OVERWORLD.name;
  state.pos = feetAt(OVERWORLD.spawn.x, OVERWORLD.spawn.y);
  state.facing = "down";
  state.stepsSinceFight = 0;
  return { goldLost: lost };
}

/* Writes the current state to the save slot. Quietly does nothing where storage isn't available. */
export const autosave = () => saveGame(state);

/* Replaces the state with the saved game, if there is one. */
export function restoreSave() {
  const saved = loadGame();
  if (!saved) return false;
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, saved);
  return true;
}

newGame();
