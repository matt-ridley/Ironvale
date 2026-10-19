// Every map in the game, by name. state.map holds one of these names.
import { createMap } from "./map.js";
import { OVERWORLD } from "./overworld.js";
import { DEEP_CAVE } from "./cave.js";

export const MAPS = Object.fromEntries([OVERWORLD, DEEP_CAVE].map(def => [def.name, createMap(def)]));
