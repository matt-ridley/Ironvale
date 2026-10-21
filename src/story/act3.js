// Act 3's conversations: the pass. Quest 6, the Scholar at the Rockslide: Hild's news that the keep shook in the night,
// Rachel camped at the foot of the rockslide with Quill, the three rune-stones the blast threw down onto the keep's
// grounds, and the Wardenblade laid against the Breaking Rune while she reads it backwards. Then the Warden carvings
// all over the old maps, which only Rachel can read, and the sealed door of the Wardens' gatehouse. Going back:
// Pip's Big Adventure (he runs off to be a Warden and finds kobolds digging in the Deep Warrens), his statue of you in
// Oakhollow, the bard and the plaque at the Sleeping Fox, and Old Gnasher's mount in Tom's hut. Quest 7, the Warden's
// Road: the ghost of Warden Colleen at three waystones, each with a trial and a rune (Iron Ward, Warden's Call, and the
// Rune of Binding, which Thorne stole: take it back from his camp), the sun half of a charm in a cairn of bones, and
// the wolves on the heights that someone sent. The companions' own quests: Matthew's Arrows (Megan finds her father at
// the old watchtower; he teaches her VOLLEY and comes to live at the keep) and the Frozen Chapel (Robyn lights the
// Wardens' chapel again, and learns Turn Undead and Spiritual Weapon).
// No Phaser here. scripts.js adds these to SCRIPTS.
import { joinParty, COMPANIONS } from "../rules/party.js";
import { learnRune } from "../rules/character.js";
import { makeItem, itemName } from "../rules/items.js";
import { pay, paid } from "./rewards.js";
import { callName, titleOf, actOf } from "./hero.js";
import { MAPS } from "../world/maps.js";

const RACHEL = "RACHEL", PIP = "PIP", COLLEEN = "WARDEN COLLEEN", MEGAN = "MEGAN", MATTHEW = "MATTHEW", ROBYN = "ROBYN";
export const MATTHEW_REWARD = { gold: 0, xp: 3000 }; // and Megan's Volley
export const CHAPEL_REWARD = { gold: 0, xp: 3000 }; // and Robyn's new prayers
export const CHAPEL_FIGHT = ["wraith", "specter"];
export const ARROWS_FOUND = ["matthewArrow1", "matthewArrow2", "matthewArrow3"];
export const arrowsFound = flags => ARROWS_FOUND.filter(f => flags[f]).length;
const withCompanion = (s, id) => s.hero.companion?.id === id;
export const WAYSTONE_REWARD = { gold: 200, xp: 2000 }; // each of the three trials
export const ROAD_REWARD = { gold: 200, xp: 2000 }; // quest 7, once all three runes are won
export const IRON_TRIAL = ["gargoyle", "gargoyle"];
export const CALL_TRIAL = ["griffon", "griffon"];
export const GUARDIAN_FIGHT = ["earthElemental", "gargoyle"];
const friendName = s => (s.hero.companion ? COMPANIONS[s.hero.companion.id].name : null);
export const PIP_REWARD = { gold: 0, xp: 1000 }; // and his Junior Warden badge
export const GNASHER_REWARD = { gold: 300, xp: 1000 };
export const KOBOLD_FIGHT = ["kobold", "kobold"];
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

  // Pip's statue of you in Oakhollow's square. It gets better as the story goes on.
  statue: {
    start: "look",
    nodes: {
      look: {
        text: s => {
          const f = s.flags, name = callName(s.hero) ? `${callName(s.hero).toUpperCase()}, ` : "";
          const bits = ["A statue of you, by Pip: mud and sticks on a stone plinth, a wooden sword twice as long as you are, and a turnip for a head."];
          if (f.rockslideOpen) bits.push("He's added a cape (a sack) and a little clay owl on one shoulder.");
          if (f.wardenTraining) bits.push("The sword has blue runes painted on it now.");
          if (f.pipRewarded) bits.push("Pip's put himself on the plinth too, a head shorter, holding the turnip's hand.");
          return `${bits.join(" ")} Carved on the plinth: ${name}${titleOf(f).toUpperCase()}.`;
        },
      },
    },
  },

  // The plaque at the Sleeping Fox.
  plaque: { start: "look", nodes: { look: { text: "A brass plaque, polished till it gleams: THE HERO SLEPT HERE. Underneath, in smaller letters someone added later: AND SNORED." } } },

  // A travelling bard at the Sleeping Fox, with a terrible song about you.
  bard: {
    start: "sing",
    nodes: {
      sing: {
        speaker: "BARD",
        text: s => `"Ohhh, ${callName(s.hero) || "the Hero"}, ${titleOf(s.flags)}, with a sword as long as a tree! Who beat the Goblin King, and the hag, and the dead, and then... went up a mountain, probably! Fol-de-rol-dee!" He bows. "I'm working on the last verse."`,
        choices: [{ label: "Tip him (5 gold)", if: s => s.hero.gold >= 5, to: "tip" }, { label: "Please stop.", to: "stop" }],
      },
      tip: { speaker: "BARD", enter: s => { s.hero.gold -= 5; }, text: "\"A patron of the arts!\" He bows so low his hat falls off. \"The next verse rhymes 'Warden' with 'garden'. It's going to be magnificent.\"" },
      stop: { speaker: "BARD", text: "\"Everyone's a critic.\" He tunes his lute, which doesn't help." },
    },
  },

  // Pip's Big Adventure: his wooden shield, dropped in the wood...
  pipShield: {
    start: "look",
    nodes: {
      look: {
        enter: s => { s.flags.pipShieldFound = true; },
        text: "A little wooden shield in the bracken, with a turnip painted on it: Pip's. His footprints go on east, towards Goblin Rocks.",
      },
    },
  },

  // ...and a chalk mark by the goblin cave.
  pipChalk: {
    start: "look",
    nodes: {
      look: {
        enter: s => { s.flags.pipChalkFound = true; },
        text: s => (s.flags.pipFound ? "PIP WOZ ERE, in chalk, and a little sword. Somebody has added: AND THE HERO." : "Scrawled on a rock by the goblin cave, in chalk: PIP WOZ ERE. And an arrow, pointing into the cave."),
      },
    },
  },

  // Pip in the Deep Warrens, behind a rock, watching the kobolds dig.
  pipWarrens: {
    start: s => (s.flags.koboldsGone ? "after" : "hide"),
    nodes: {
      hide: {
        speaker: PIP,
        enter: s => { s.flags.pipMetWarrens = true; },
        text: "Shh! Kobolds! They're digging, and they keep saying it's for \"the Great One beyond the mountain\". I was going to fight them. Any minute now. I was just... planning.",
      },
      after: { speaker: PIP, enter: s => { s.flags.pipFound = true; }, text: "We beat them! I'm going home to tell Mum. Come and see us!" },
    },
  },

  // The kobolds: not a real fight for you any more.
  kobolds: {
    start: "look",
    nodes: {
      look: {
        text: "Two kobolds in candle-hats are digging at the wall with tiny picks. \"Dig, dig! For the Great One beyond the mountain!\" One sees you, and squeaks. \"Big one! BIG ONE!\"",
        choices: [{ label: "Fight!", to: "fight" }, { label: "Back away", to: null }],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...KOBOLD_FIGHT], zone: "warrens", winFlag: "koboldsGone", afterWin: "koboldsFled" }) },
    },
  },

  // Straight after the kobolds: Pip comes out from behind his rock.
  koboldsFled: {
    start: "flee",
    nodes: {
      flee: {
        text: "The last kobold squeals and dives into its tunnel. \"The Great One will eat you!\" it shrieks from the dark. \"The Great One beyond the mountain!\" Then it's gone.",
        to: "pip",
      },
      pip: {
        speaker: PIP,
        enter: s => { s.flags.pipFound = true; },
        text: "Did you SEE that? We beat them! Well, you did. I watched. Very bravely. I'm going home to tell Mum before she finds out herself. Come and see us!",
      },
    },
  },

  // Old Gnasher on Tom's wall.
  gnasherMount: { start: "look", nodes: { look: { text: "Old Gnasher, mounted on a board over Tom's fireplace, still looking grumpy about it. A label in Tom's wobbly hand: CAUGHT BY THE HERO. LET GO OF THE DUCK." } } },

  // Warden Colleen and her three waystones (the map object says which `stone`; the stone and her ghost share this).
  colleen: {
    start: (s, { object }) => {
      const f = s.flags;
      if (object.stone === 1) return f.waystoneIron ? "after1" : f.metColleen ? "trial1" : "meet1";
      if (object.stone === 2) return !f.waystoneIron ? "silent" : f.waystoneCall ? "after2" : "trial2";
      if (!f.waystoneCall) return "bare";
      return f.wardensRoad ? "after3" : f.bindingRecovered ? "return3" : f.bindingStolen ? "hunt3" : "bare3";
    },
    nodes: {
      silent: { text: "A tall waystone, carved with runes gone dark. It's waiting for something. Perhaps for whoever passes the first stone's trial." },
      bare: { text: "A waystone stripped bare: its carving is gone, smooth as river ice, as if someone had lifted it out whole." },
      // The first stone: Iron.
      meet1: {
        text: "The waystone hums as you come near. Frost races across it, and a woman steps out of the cold air: a knight in old Warden mail, pale as moonlight, with your crest on her shield.",
        to: "blood",
      },
      blood: {
        speaker: COLLEEN,
        text: "\"So the blade came home.\" She looks at your sword, then at you, for a long time. \"That crest was my son's. I sent him south with it the night the garrison fell, wrapped in my cloak. My blood. After a hundred years.\"",
        choices: [{ label: "Who are you?", to: "who" }, { label: "Your son?", to: "who" }],
      },
      who: {
        speaker: COLLEEN,
        enter: s => { s.flags.metColleen = true; },
        text: "Colleen, last Warden of Ironvale. I held the door when the others fell, and I'm holding it still, what's left of me. Now a thief climbs my road, tearing my runes out of the stones.",
        to: "road",
      },
      road: {
        speaker: COLLEEN,
        text: "Three waystones on this road, and a rune in each, for a Warden who passes its trial. This one is Iron: the rune that turns a blow aside. Thorne's stone creatures are coming up the road. Hold this stone for three rounds.",
        choices: [{ label: "I'm ready.", to: "fight1" }, { label: "Not yet.", to: null }],
      },
      trial1: {
        speaker: COLLEEN,
        text: "Hold the stone for three rounds against Thorne's gargoyles, and Iron is yours. You needn't win. Only stand.",
        choices: [{ label: "I'm ready.", to: "fight1" }, { label: "Not yet.", to: null }],
      },
      fight1: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...IRON_TRIAL], zone: "slopes", surviveRounds: 3, afterWin: "ironTrial" }) },
      after1: { speaker: COLLEEN, text: "Rest by my fire if you need it: it turns out ghosts can light one. The next stone is above the snowfield. Mind the ice. It doesn't care who you are." },
      // The second stone: the Call.
      trial2: {
        speaker: COLLEEN,
        text: s => (friendName(s)
          ? `The Call. A Warden never holds a door alone: this rune keeps your people standing. Keep ${friendName(s)} on their feet through one fight, and the Call is yours.`
          : "The Call keeps a Warden's people standing. You walk alone? Then the Call must answer to you alone: hold the stone for five rounds."),
        choices: [{ label: "I'm ready.", to: "fight2" }, { label: "Not yet.", to: null }],
      },
      fight2: {
        enter: (s, ctx) => ctx.emit(s.hero.companion
          ? { type: "battle", foes: [...CALL_TRIAL], zone: "snowfield", guardAlly: true, afterWin: "callTrial", afterFail: "callFail" }
          : { type: "battle", foes: [...CALL_TRIAL], zone: "snowfield", surviveRounds: 5, afterWin: "callTrial" }),
      },
      after2: { speaker: COLLEEN, text: "The last stone is on the heights, over the chasm. Go carefully. I can't feel its rune any more, and I don't like that." },
      // The third stone: the Binding, stolen.
      bare3: {
        text: "The third waystone has been stripped bare: the carving's smooth as river ice, as if someone lifted it out whole.",
        to: "stolen",
      },
      stolen: {
        speaker: COLLEEN,
        enter: s => { s.flags.bindingStolen = true; },
        text: "Thorne. He took the Binding. I can feel it burning east of here, on the heights, like a coal in the snow: his camp. He's left something to guard it. Take it back.",
      },
      hunt3: { speaker: COLLEEN, text: "The Binding burns in Thorne's camp, east along the heights. Take it back." },
      return3: {
        text: "You touch the Wardenblade to the bare stone, and the Binding flows into it too. The carving fills in, line by line, and glows.",
        to: "dawn",
      },
      dawn: {
        speaker: COLLEEN,
        text: "Iron, the Call and the Binding. I stood like a wall, and called it Iron. Some of us loved the runes, and called it Storm. And some swore to the light at the threshold: Dawn. The dead don't pass a Warden of the Dawn.",
        to: "road3",
      },
      road3: {
        speaker: COLLEEN,
        enter: (s, ctx) => {
          s.flags.waystoneBinding = true;
          s.flags.wardensRoad = true;
          pay(s, ctx, { gold: WAYSTONE_REWARD.gold + ROAD_REWARD.gold, xp: WAYSTONE_REWARD.xp + ROAD_REWARD.xp });
        },
        text: (s, ctx) => `That's all three: the runes the gatehouse door wants. Thorne is already up there. Go, before he opens what I've held shut for a hundred years. ${paid(ctx, { gold: WAYSTONE_REWARD.gold + ROAD_REWARD.gold, xp: WAYSTONE_REWARD.xp + ROAD_REWARD.xp })}`,
      },
      after3: { speaker: COLLEEN, text: "The gatehouse is at the top of the road. Go. I'll be at the door." },
    },
  },

  // After the trial of Iron.
  ironTrial: {
    start: "rune",
    nodes: {
      rune: {
        enter: (s, ctx) => {
          learnRune(s.hero, "ironWard");
          s.flags.waystoneIron = true;
          s.flags.wardenTraining = true;
          pay(s, ctx, WAYSTONE_REWARD);
        },
        text: (s, ctx) => `The waystone blazes, and a rune lifts out of it like a spark and settles into your blade. You've learned IRON WARD! (When a monster's blow is going to hit you, the fight asks: spend a rune slot for +5 AC, and it may miss.) ${paid(ctx, WAYSTONE_REWARD)}`,
        to: "trainee",
      },
      trainee: {
        speaker: COLLEEN,
        text: "Warden-in-training. It's a start. Iron is how I held the door: like a wall, nothing passing while I stood. There are other ways. You'll find yours. The next stone is above the snowfield.",
      },
    },
  },

  // After the trial of the Call, passed...
  callTrial: {
    start: "rune",
    nodes: {
      rune: {
        enter: (s, ctx) => {
          learnRune(s.hero, "wardensCall");
          s.flags.waystoneCall = true;
          pay(s, ctx, WAYSTONE_REWARD);
        },
        text: (s, ctx) => `The second waystone rings like a bell, and its rune flies to your blade. You've learned WARDEN'S CALL! (SKILLS in a fight: you and your companion heal 2d8 + your level and shake off paralysis, fear and sleep.) ${paid(ctx, WAYSTONE_REWARD)}`,
        to: "storm",
      },
      storm: {
        speaker: COLLEEN,
        text: "Some of us loved the runes more than the wall. Storm, they called them: blue fire down the blade, and the runes answering before they were asked. The last stone is on the heights, past the chasm.",
      },
    },
  },
  // ...or not: your companion fell.
  callFail: {
    start: "fell",
    nodes: {
      fell: {
        speaker: COLLEEN,
        text: s => `${friendName(s) || "Your friend"} fell. A Warden's people stand, or the Warden hasn't held. Rest, see to them, and try again.`,
      },
    },
  },

  // Thorne's camp on the heights: the guardian with the Binding in its chest, his tent, his notes and his mirror.
  thorneGuardian: {
    start: "look",
    nodes: {
      look: {
        text: "A heap of rock and ice beside a cold fire stirs, and stands. An earth elemental, the Rune of Binding burning in its chest like a coal, Thorne's marks glowing on its arms. A gargoyle drops from the rocks beside it.",
        choices: [{ label: "Fight!", to: "fight" }, { label: "Back away", to: null }],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...GUARDIAN_FIGHT], zone: "thorneCamp", winFlag: "guardianBeaten", afterWin: "bindingTaken" }) },
    },
  },
  bindingTaken: {
    start: "rune",
    nodes: {
      rune: {
        enter: s => {
          learnRune(s.hero, "binding");
          s.flags.bindingRecovered = true;
        },
        text: "The guardian falls apart into rubble and ice. The Rune of Binding hangs in the air, then flies to your blade. You've learned the RUNE OF BINDING! (SKILLS: a monster makes a CON save against your rune, or loses its next turn.) Colleen will want to know.",
      },
    },
  },
  thorneTent: { start: "look", nodes: { look: { text: "Thorne's tent: a bedroll, a dozen burnt-down candles, and rubbings of Warden carvings pinned up everywhere. Some are rubbings of carvings that don't exist any more." } } },
  thorneFire: { start: "look", nodes: { look: { text: "A cold campfire. The ashes are still warm underneath. He left only hours ago." } } },
  thorneNotes: {
    start: "read",
    nodes: {
      read: {
        enter: s => { s.flags.readThorneNotes = true; },
        text: "Thorne's notes, in a cramped hand. \"The voice says the door was never meant to hold. That the Wardens were jailers, and those beyond were wronged. It promises me every rune ever carved, if I open it. Rachel would understand.\"",
        to: "rachel",
      },
      rachel: {
        enter: (s, ctx) => { if (!withRachel(s)) ctx.goto(null); },
        speaker: RACHEL,
        text: "That's his hand. He used to write in the margins of my essays: \"Excellent.\" \"Bolder.\" Now this. I think I'm going to be sick.",
      },
    },
  },
  thorneMirror: {
    start: "look",
    nodes: {
      look: {
        enter: s => { s.flags.mirrorTaken = true; s.hero.inventory.push(makeItem("thorneMirror")); },
        text: "A silver hand mirror on a flat rock, polished bright: Thorne's. Something shiny. You take it; somebody might want it.",
      },
    },
  },

  // A cairn of bones on the snowfield, with the sun half of a charm wound into it: Claire's (Rachel's twin, Act 4).
  boneCairn: {
    start: s => (s.flags.sunCharmFound ? "taken" : "look"),
    nodes: {
      look: {
        text: "A cairn of old animal bones, wolf and deer, stacked with care. Wound into the top on a strip of leather: half of a gold charm. A sun.",
        choices: [{ label: "Take the charm", to: "take" }, { label: "Leave it", to: null }],
      },
      take: {
        enter: (s, ctx) => {
          s.flags.sunCharmFound = true;
          s.hero.inventory.push(makeItem("sunCharm"));
          if (!withRachel(s)) ctx.goto("taken1");
        },
        text: "Rachel goes very quiet. Her hand goes to the half-moon at her throat. \"Can I hold that? Just for a minute.\" She holds it a long time, then gives it back without a word.",
      },
      taken1: { text: "You take the half-charm. It's old, and someone wound it into those bones on purpose." },
      taken: { text: "The cairn of bones, stacked with care. Whoever built it knew what they were doing." },
    },
  },

  // The wolves on the heights, the first time you climb up: someone sent them.
  wolves: {
    start: "trolls",
    nodes: {
      trolls: {
        text: "Two trolls lumber out of the rocks ahead, sniffing the wind. Before you can draw, a howl splits the air: a wolf pack pours down the slope, grey and silent, and drives the trolls snarling back over the edge.",
        to: "gone",
      },
      gone: {
        text: "The wolves stop. Their leader looks straight at you with pale gold eyes. Then the pack turns and is gone into the snow, as if someone had called them home.",
        to: "rachel",
      },
      rachel: {
        enter: (s, ctx) => { if (!withRachel(s)) ctx.goto(null); },
        speaker: RACHEL,
        text: "Wolves don't do that. She stares after them for a long time. \"Wolves don't DO that.\"",
      },
    },
  },

  // Matthew's Arrows: his arrows along the pass. Only Megan knows them (the object says which flag it sets).
  matthewArrow: {
    start: s => (withCompanion(s, "megan") ? "megan" : "plain"),
    nodes: {
      plain: { text: "An old arrow in the snow, grey goose feathers with a little nick in each. Megan would know whose." },
      megan: {
        enter: (s, ctx) => { s.flags[ctx.object.flag] = true; },
        speaker: MEGAN,
        text: s => (arrowsFound(s.flags) < 3
          ? `That's his! Grey goose, and the nick in the feathers. Da's. (${arrowsFound(s.flags)} of 3) They're leading west, and up.`
          : "Another one. They all point the same way: west, on the heights, to that old tower. He's there. I know he's there."),
      },
    },
  },

  // Matthew at the old watchtower: he shoots at strangers, and only comes out for Megan.
  matthew: {
    start: s => (!withCompanion(s, "megan") ? "warning" : s.flags.matthewQuest ? "meg" : "warning"),
    nodes: {
      warning: { text: "An arrow thunks into the snow at your feet. \"That's close enough!\" shouts a voice from the tower. \"Go back down the mountain!\"" },
      meg: { speaker: MEGAN, text: "Da? DA! It's me! It's Meg!", to: "door" },
      door: {
        text: "Silence. Then the tower door creaks, and a grey-bearded man in a griffon-feather cloak comes out, very slowly, as if the snow might break.",
        to: "look",
      },
      look: { speaker: MATTHEW, text: "Meg? Little Meg? Look at you. And look at that bow. That's my bow.", to: "why" },
      why: {
        speaker: MATTHEW,
        text: "Griffons took the survey party, ten years ago, up on the heights. I lived. I didn't think I deserved to go home and say so. So I stayed up here and hunted the things that took them.",
        to: "stubborn",
      },
      stubborn: { speaker: MEGAN, text: "You stupid, stubborn... I'm so glad you're alive.", to: "owe" },
      owe: {
        speaker: MATTHEW,
        text: "You brought her up a mountain she's scared of. I owe you everything. Meg, come here. Let me show you something I should have taught you years ago.",
        to: "volley",
      },
      volley: {
        enter: (s, ctx) => {
          s.hero.companion.volley = true;
          s.flags.matthewFound = true;
          pay(s, ctx, MATTHEW_REWARD);
        },
        text: (s, ctx) => `Matthew shows Megan how to nock three arrows at once and loose them in one breath. Megan learned VOLLEY! (Once a fight, she shoots at every monster.) ${paid(ctx, MATTHEW_REWARD).replace("+0 gold, ", "")}`,
        to: "home",
      },
      home: { speaker: MATTHEW, text: "I'll come down to your keep, if there's room for an old man. It's time. And I'll want a rematch with that girl at the targets." },
    },
  },

  // Matthew at the keep: archery rematches, and something he saw, years ago.
  matthewKeep: {
    start: "hello",
    nodes: {
      hello: {
        speaker: MATTHEW,
        text: s => (s.flags.wonMatthewArchery ? "Fancy another round at the targets? I'm still on 40. No prize, just pride." : "A rematch at the targets? Beat my 40 and you'll have my griffon longbow, for Meg. It's the best bow I ever made."),
        choices: [
          { label: "Archery!", to: "play" },
          { label: "Seen anything strange up there?", if: s => withCompanion(s, "rachel"), to: "claire" },
          { label: "Not now", to: null },
        ],
      },
      play: { enter: (s, ctx) => ctx.emit({ type: "minigame", key: "Archery", data: { rival: "matthew" } }) },
      claire: {
        speaker: MATTHEW,
        enter: s => { s.flags.matthewClaire = true; },
        text: "Strange? A girl came down the pass once, years back. Wild hair, a wolf pelt, running with the pack on all fours. Had your face, scholar.",
        to: "rachel",
      },
      rachel: { speaker: RACHEL, text: "...You must be mistaken. It was a long winter. Everyone sees things." },
    },
  },

  // The Frozen Chapel's altar: only Robyn can light it again.
  iceAltar: {
    start: s => (s.flags.chapelLit ? "lit" : withCompanion(s, "robyn") ? "robyn" : "cold"),
    nodes: {
      cold: { text: "A Warden altar under a skin of black ice, the sun of the Dawn carved on it. The cold in here isn't just cold: it watches. You'd need a priest to wake this place." },
      robyn: {
        speaker: ROBYN,
        text: "This is it. Their chapel. I can feel the light under all that ice, like a fire under ash. Stand with me. Something in here won't want it back.",
        choices: [{ label: "Light it.", to: "pray" }, { label: "Not yet.", to: null }],
      },
      pray: {
        text: "Robyn kneels and prays. The ice on the altar cracks like a shot, and the shadows in the corners stand up.",
        to: "fight",
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...CHAPEL_FIGHT], zone: "frozenChapel", winFlag: "chapelCleared", afterWin: "chapelLit" }) },
      lit: { text: "The altar glows warm, the braziers burning without fuel. Rest by them: the Frozen Chapel is a camp now." },
    },
  },
  chapelLit: {
    start: "light",
    nodes: {
      light: { text: "Robyn finishes her prayer in the quiet. Gold light runs along the old carvings, the ice slides off the altar, and the braziers catch by themselves.", to: "answer" },
      answer: {
        speaker: ROBYN,
        enter: (s, ctx) => {
          const c = s.hero.companion;
          if (c?.id === "robyn") c.spells = [...new Set([...(c.spells || ["sacredFlame", "cureWounds", "healingWord", "bless"]), "turnUndead", "spiritualWeapon"])];
          s.flags.chapelLit = true;
          pay(s, ctx, CHAPEL_REWARD);
        },
        text: (s, ctx) => `Dawn. It answered. It ANSWERED. (Robyn learned TURN UNDEAD and SPIRITUAL WEAPON! ${paid(ctx, CHAPEL_REWARD).replace("(+0 gold, ", "(")})`,
        to: "oath",
      },
      oath: { speaker: ROBYN, text: "The Wardens who prayed here swore an Oath of Dawn. The dead don't pass them. I think... I think it would suit you. But you'll choose." },
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

/* Things that happen as you walk into a zone: Pip runs away from Oakhollow once the pass is open, and the wolves on
   the heights. Returns { note } for the HUD or { script } to play, or null. (The World scene calls this on every new
   zone.) */
export function zoneEvent(state, zoneId) {
  const f = state.flags;
  if (zoneId === "village" && actOf(f) >= 3 && f.rockslideOpen && !f.pipRanAway) {
    f.pipRanAway = true;
    return { note: "Hazel runs up the path, white as flour: \"Have you seen Pip? He's gone!\"" };
  }
  if (zoneId === "heights" && !f.sawWolves) {
    f.sawWolves = true;
    return { script: "wolves" };
  }
  return null;
}
