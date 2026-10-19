// Every map in the game, by name. state.map holds one of these names.
import { createMap } from "./map.js";
import { OVERWORLD } from "./overworld.js";
import { DEEP_CAVE } from "./cave.js";
import { HOUSES } from "./houses.js";

export const MAPS = Object.fromEntries([OVERWORLD, DEEP_CAVE, ...HOUSES].map(def => [def.name, createMap(def)]));
