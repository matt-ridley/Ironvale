// The one game state every scene shares: the hero and where they are. Saving (M6) will write this object.
import { createCharacter } from "../rules/character.js";
import { OVERWORLD } from "../world/overworld.js";

export const state = {};

export function newGame() {
  state.hero = createCharacter();
  state.map = OVERWORLD.name;
  state.pos = { ...OVERWORLD.spawn };
  state.facing = "down";
}

newGame();
