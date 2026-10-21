// Act 3's conversations: the pass. Quest 6, the Scholar at the Rockslide: Hild's news that the keep shook in the night,
// Rachel camped at the foot of the rockslide with Quill, the three rune-stones the blast threw down onto the keep's
// grounds, and the Wardenblade laid against the Breaking Rune while she reads it backwards. Then the Warden carvings
// all over the old maps, which only Rachel can read, and the sealed door of the Wardens' gatehouse.
// No Phaser here. scripts.js adds these to SCRIPTS.
import { joinParty, COMPANIONS } from "../rules/party.js";
import { makeItem, itemName } from "../rules/items.js";
import { pay, paid } from "./rewards.js";
import { callName } from "./hero.js";
import { MAPS } from "../world/maps.js";

const RACHEL = "RACHEL";
export const ROCKSLIDE_REWARD = { gold: 400, xp: 4000 }; // quest 6, when the rockslide opens
export const RUNE_STONES = ["runeStone1", "runeStone2", "runeStone3"];
/* How many of the three rune-stones you've picked up. */
export const stonesFound = flags => RUNE_STONES.filter(f => flags[f]).length;
/* True if Rachel is travelling with you (she reads the carvings). */
export const withRachel = s => s.hero.companion?.id === "rachel";

/* What Quill finds when he scouts a map from a camp: its unopened chests and the carvings Rachel hasn't read yet. */
export const secretsOn = (map, flags) => map.objects.filter(o => (o.script === "chest" && !flags[o.goneWhen] && (!o.shownWhen || flags[o.shownWhen]))
  || (o.script === "carving" && !flags[`read_${o.id}`]));
export const scoutedFlag = mapName => `scouted_${mapName}`;

export const ACT3_SCRIPTS = {
  // Rachel, at her camp below the rockslide. Find the rune-stones, lay your blade against the rune, and she joins you.
  rachel: {
    start: s => (stonesFound(s.flags) === 3 ? "stones" : s.flags.metRachel ? "waiting" : "hello"),
    nodes: {
      hello: {
        speaker: RACHEL,
        text: "Oh! Don't step on the... never mind, those were only my notes. I'm Rachel. The owl is Quill. He bites, but only people he likes.",
        to: "rune",
      },
      rune: {
        speaker: RACHEL,
        text: "Look at these rocks. See the mark burned into them, like frost? That's a Breaking Rune. Someone brought the mountain down on purpose, from the far side, last night.",
        choices: [{ label: "Who would do that?", to: "thorne" }, { label: "The keep shook.", to: "thorne" }],
      },
      thorne: {
        speaker: RACHEL,
        text: "Aldric Thorne. My old teacher. He's lifting the Wardens' runes out of the old carvings and using them himself, and every rune he takes is gone from the stone for good. He's climbing to the door.",
        to: "plan",
      },
      plan: {
        speaker: RACHEL,
        enter: s => { s.flags.metRachel = true; },
        text: "I can read the rune, but I can't undo it alone. The blast threw three rune-stones down onto the keep's grounds: I watched them fall. Find them for me. And... is that a Warden's blade? Oh, that's perfect.",
      },
      waiting: {
        speaker: RACHEL,
        text: s => `${stonesFound(s.flags)} of the three rune-stones. They're down on the keep's grounds, glowing a little blue: west of the walls, east of them, and one south-east by the causeway. Quill says hurry. Quill always says hurry.`,
      },
      stones: {
        speaker: RACHEL,
        text: "You found all three! Set them round the rune... there. Now lay your blade flat against it, and I'll read it backwards. If I'm wrong, we'll both have very short eyebrows.",
        choices: [{ label: "Lay the Wardenblade against the rune", to: "open" }, { label: "Not yet.", to: null }],
      },
      open: {
        enter: (s, ctx) => {
          s.flags.rockslideOpen = true;
          pay(s, ctx, ROCKSLIDE_REWARD);
        },
        text: (s, ctx) => `The rune flares white under your blade. Rachel reads in a fast, sure voice, and the rocks split down the middle with a crack like thunder and roll aside. The old Warden road climbs on into the snow. ${paid(ctx, ROCKSLIDE_REWARD)}`,
        to: "join",
      },
      join: {
        speaker: RACHEL,
        text: "Thorne's ahead of us, taking the Wardens' magic as he goes. I'm coming with you. Don't argue: you can't read a word of it, and I can.",
        to: "joined",
      },
      joined: {
        enter: (s, ctx) => {
          const left = joinParty(s.hero, "rachel");
          s.flags.rachelJoined = true;
          ctx.remember("left", left && COMPANIONS[left].name);
        },
        text: (s, ctx) => `Rachel joined your party! Round her neck hangs half a silver charm, a crescent moon, its other half snapped off long ago.${ctx.recall("left") ? ` ${ctx.recall("left")} will wait for you at an inn: swap them there any time.` : ""} (Give Rachel spell scrolls from her tab in the bag to copy them into her book.)`,
      },
    },
  },

  // Rachel's tent.
  tent: {
    start: "look",
    nodes: { look: { text: "Rachel's tent: a bedroll, a lantern, and far too many books. Somebody has made an owl's perch out of a broken telescope." } },
  },

  // One of the three rune-stones (the map object says which flag it sets).
  runeStone: {
    start: "look",
    nodes: {
      look: {
        enter: (s, ctx) => { s.flags[ctx.object.flag] = true; },
        text: s => `A grey stone, still warm, with a rune on it glowing faintly blue. It must have been thrown down from the rockslide. You take it. (${stonesFound(s.flags)} of 3${s.flags.metRachel ? "" : ": someone at the rockslide might want these"})`,
      },
    },
  },

  // The rockslide: Thorne's Breaking Rune.
  rockslide: {
    start: "look",
    nodes: {
      look: {
        text: s => (s.flags.metRachel
          ? `The rockslide, with Thorne's Breaking Rune burned into it like frost. Rachel needs the rune-stones: ${stonesFound(s.flags)} of 3.`
          : "Rocks the size of houses block the old road into the mountains. Not even Brannoc could shift these. Something shook them down, and not long ago."),
      },
    },
  },

  // An old Warden carving (the map object has its `lore` and a `cache`). Only Rachel can read them; the first reading
  // finds the cache.
  carving: {
    start: (s, { object }) => (!withRachel(s) ? "worn" : s.flags[`read_${object.id}`] ? "again" : "read"),
    nodes: {
      worn: { text: s => `Worn carvings on an old stone, in a script you can't read: the Wardens' runes.${s.flags.rachelJoined ? " Rachel could read this." : " Someone who knows runes might."}` },
      read: {
        enter: (s, ctx) => {
          const o = ctx.object;
          s.flags[`read_${o.id}`] = true;
          s.hero.gold += o.cache?.gold || 0;
          const items = (o.cache?.items || []).map(base => makeItem(base));
          s.hero.inventory.push(...items);
          ctx.remember("found", [o.cache?.gold ? `${o.cache.gold} gold` : "", ...items.map(itemName)].filter(Boolean));
        },
        speaker: RACHEL,
        text: (s, ctx) => ctx.object.lore,
        to: "cache",
      },
      cache: { text: (s, ctx) => `Where the carving said, you find: ${ctx.recall("found").join(", ")}!` },
      again: { speaker: RACHEL, text: (s, ctx) => `${ctx.object.lore} (You've already found what it marks.)` },
    },
  },

  // The great door of the Wardens' gatehouse, at the top of the pass. Sealed with three runes.
  gatehouseDoor: {
    start: "look",
    nodes: {
      look: {
        text: s => `A door of black iron as tall as a house, cut into the mountain. Three runes are carved across it, and none of them glows.${withRachel(s) ? " Rachel: \"Iron, the Call, and Binding. It wants a Warden who knows all three.\"" : ""}`,
      },
    },
  },
};

/* Sending Quill to scout from a camp (a node in the campfire script): he marks this map's secrets on the world map. */
export const scoutNode = {
  enter: (s, ctx) => {
    s.flags[scoutedFlag(s.map)] = true;
    const found = secretsOn(MAPS[s.map], s.flags);
    ctx.remember("chests", found.filter(o => o.script === "chest").length);
    ctx.remember("carvings", found.filter(o => o.script === "carving").length);
  },
  speaker: RACHEL,
  text: (s, ctx) => {
    const c = ctx.recall("chests"), r = ctx.recall("carvings");
    if (!c && !r) return "Quill swoops off into the dark and comes back looking bored. \"Nothing left to find round here,\" Rachel says. \"He's very disappointed in you.\"";
    const what = [c && `${c} chest${c > 1 ? "s" : ""}`, r && `${r} carving${r > 1 ? "s" : ""}`].filter(Boolean).join(" and ");
    return `Quill swoops off and comes back an hour later, hooting smugly. "${what} still to find round here," Rachel says. "He's marked them on your map." (Gold diamonds, on this region's map.)`;
  },
};

/* Hild's news, at the start of Act 3: the keep shook in the night. (keepHall in scripts.js goes here first.) */
export const tremorNode = {
  speaker: "HILD",
  enter: s => { s.flags.heardTremor = true; },
  text: s => `${callName(s.hero) || "My lord"}, the keep shook last night. Dust from every ceiling, and Brannoc swears his anvil jumped. It came from the north, from the Mountain Pass. Someone should look at that rockslide.`,
  to: "hello",
};
