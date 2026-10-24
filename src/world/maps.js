// Every map in the game, by name. state.map holds one of these names.
import { createMap } from "./map.js";
import { OVERWORLD } from "./overworld.js";
import { DEEP_CAVE } from "./cave.js";
import { HOUSES } from "./houses.js";
import { IRONVALE } from "./ironvale.js";
import { KEEP } from "./keep.js";
import { PASS } from "./pass.js";
import { GATEHOUSE } from "./gatehouse.js";
import { BEYOND } from "./beyond.js";
import { EMBERDEEP } from "./emberdeep.js";

export const MAPS = Object.fromEntries([OVERWORLD, DEEP_CAVE, ...HOUSES, IRONVALE, KEEP, PASS, GATEHOUSE, BEYOND, EMBERDEEP].map(def => [def.name, createMap(def)]));
