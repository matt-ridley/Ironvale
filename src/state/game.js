// The one game state every scene shares: the hero and where they are. Saving (M6) will write this object.
import { createCharacter, rest } from "../rules/character.js";
import { OVERWORLD } from "../world/overworld.js";

export const state = {};

export function newGame() {
  state.hero = createCharacter();
  state.map = OVERWORLD.name;
  state.pos = { ...OVERWORLD.spawn };
  state.facing = "down";
  state.stepsSinceFight = 0;
}

/* Losing a fight isn't the end: you wake in the village, rested, but half your gold is gone. */
export function faint() {
  const lost = Math.floor(state.hero.gold / 2);
  state.hero.gold -= lost;
  rest(state.hero);
  state.map = OVERWORLD.name;
  state.pos = { ...OVERWORLD.spawn };
  state.facing = "down";
  state.stepsSinceFight = 0;
  return { goldLost: lost };
}

newGame();
