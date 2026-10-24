// Act 4, Beyond the Door: the story so far. Quest 9, Through the Door: Hild's news at the keep (the crack glows, kobolds
// pour out of the Warrens), opening the Door with the Wardenblade (its nodes are in act3.js's greatDoor), the far side
// (the Threshold, and Pip climbing out of your pack if he's had his big adventure), the kobold warband on the ash road,
// the wolves that scatter them (and carry Pip home), and the great grey wolf that leads you to the wildwood's edge.
// The roadmap's Act 4 section has the rest. No Phaser here.
import { pay, paid } from "./rewards.js";
import { callName } from "./hero.js";
import { withRachel } from "./act3.js";

const RACHEL = "RACHEL", HILD = "HILD", PIP = "PIP", KOBOLD = "KOBOLD";
export const Q9_REWARD = { gold: 500, xp: 10000 };

export const ACT4_SCRIPTS = {
  // Back at the keep after Act 3: Hild's news, and how to get through the Door (Rachel's reading, or Hild's report of it).
  doorNews: {
    start: "news",
    nodes: {
      news: {
        speaker: HILD,
        enter: s => { s.flags.q9Started = true; },
        text: s => `${callName(s.hero) || "My lord"}, the crack in the Door glows at night now. You can see it from the walls, red as a forge. And the Warrens are spitting out kobolds, dozens of them, all running for the mountain.`,
        to: "plan",
      },
      plan: {
        enter: (s, ctx) => { if (!withRachel(s)) ctx.goto("hildPlan"); },
        speaker: RACHEL,
        text: "\"The Door answers a Warden. It let the Wardens out; it'll let one in. Lay the blade against it with all three runes lit, and it should open, and shut behind you.\" She's already packing. \"She's on the other side. Let's go.\"",
      },
      hildPlan: {
        speaker: HILD,
        text: "Rachel's been through every book in the library. She says the Door answers a Warden: lay the Wardenblade against it with all three runes lit, and it opens, and shuts behind you. Whatever's on the other side.",
      },
    },
  },

  // The first time you step through: the far side, the footprints, and maybe a stowaway.
  throughDoor: {
    start: "step",
    nodes: {
      step: {
        text: "You step through. Heat, and the smell of a burned forest. Before you is the Wardens' old gate-camp, the Threshold: flagstones, broken walls, a fire-pit full of old ash. Beyond it a road runs north under a red sky, grey with ash.",
        to: "prints",
      },
      prints: {
        enter: (s, ctx) => { if (!withRachel(s)) ctx.goto("printsAlone"); },
        speaker: RACHEL,
        text: "\"Footprints. Bare feet, in the ash, going north up the road.\" Rachel crouches over them. \"Claire never wore shoes either. Mum used to despair.\"",
        to: "pip",
      },
      printsAlone: { text: "In the ash: footprints, small and bare, going north up the road.", to: "pip" },
      pip: {
        enter: (s, ctx) => { if (!s.flags.pipRewarded || s.flags.pipStowedAway) return ctx.goto(null); s.flags.pipStowedAway = true; },
        speaker: PIP,
        text: "Something in your pack sneezes. Then it says \"Ow.\" Pip climbs out, grey with ash, wooden sword and all. \"Junior Warden Pip, reporting! I hid in your bedroll. Don't tell Mum.\"",
      },
    },
  },

  // Pip at the Threshold, until the wolves take him home.
  pipStowaway: {
    start: "hello",
    nodes: {
      hello: {
        speaker: PIP,
        text: s => `I'm guarding the camp${callName(s.hero) ? `, ${callName(s.hero)}` : ""}. From... whatever lives here. What lives here? Don't tell me. Actually, tell me.`,
      },
    },
  },

  // The kobold warband across the ash road, and the wolves that drive them off.
  warband: {
    start: "face",
    nodes: {
      face: {
        speaker: KOBOLD,
        text: "A dozen kobolds block the road, rust-red, with picks and candles on their heads. The biggest waves a rusty spear. \"Turn back, Door-thief! The Great One is waking, and the Great One is HUNGRY!\"",
        choices: [{ label: "Draw your sword", to: "howl" }, { label: "Back away", to: null }],
      },
      howl: { text: "Before you take a step, a howl rolls out of the forest to the west. Then another. Then a dozen.", to: "wolves" },
      wolves: {
        enter: s => { s.flags.warbandFled = true; },
        text: "Grey wolves pour out of the trees, big as ponies, and the kobolds scatter, squealing, back towards the gorge. The wolves don't touch them. They don't touch you either. One huge grey wolf stops in the road, looks right at you, and trots west towards the trees.",
        to: "pip",
      },
      pip: {
        enter: (s, ctx) => { if (!s.flags.pipStowedAway || s.flags.pipSentHome) return ctx.goto("rachel"); s.flags.pipSentHome = true; },
        speaker: PIP,
        text: "Another wolf pads back to the Threshold, picks Pip up by his collar as gently as a cat with a kitten, and carries him off through the Door, legs kicking. \"PUT ME DOWN! I'm a JUNIOR WARDEN!\" (The wolf will see him home to Oakhollow.)",
        to: "rachel",
      },
      rachel: {
        enter: (s, ctx) => { if (!withRachel(s)) ctx.goto(null); },
        speaker: RACHEL,
        text: "\"Wolves don't do that. Not on their own.\" She's very pale. \"Someone sent them.\"",
      },
    },
  },

  // The great grey wolf at the wildwood's edge: quest 9 done.
  wolfGuide: {
    start: "look",
    nodes: {
      look: {
        text: "The great grey wolf waits where the ash turns to grass, at the edge of the wildwood. As you come close it turns and walks in under the trees, and looks back at you: follow.",
        to: "done",
      },
      done: {
        enter: (s, ctx) => { s.flags.q9Done = true; pay(s, ctx, Q9_REWARD); },
        text: (s, ctx) => `Somewhere deep in the wildwood, a girl laughs.${withRachel(s) ? " Rachel goes very still." : ""} ${paid(ctx, Q9_REWARD)} QUEST COMPLETE: Through the Door.`,
      },
    },
  },
  wolfWaiting: {
    start: "look",
    nodes: {
      look: { text: "The grey wolf sits at the mouth of a trail into the wildwood, waiting for you. Past it the trees are too thick to see through. (The wildwood comes in the next part of Act 4.)" },
    },
  },

  // The end of the road, at the lip of the gorge.
  gorgeEdge: {
    start: "look",
    nodes: {
      look: {
        text: s => `The road ends at the lip of a gorge. Far below, a river of fire. The Wardens' old bridge lies in pieces down there, its broken piers still standing. Across it the land is burned black, all the way north to a mountain that smokes.${s.flags.oath === "iron" ? " The piers are sound. Someone strong enough could hold a span of it up, for a moment." : ""}`,
      },
    },
  },
};

/* Things that happen as you walk into a zone in Act 4 (the World scene asks after act3.js's zoneEvent): Hild's news
   at the keep, and the far side of the Door the first time. Returns { script } or null. */
export function act4Event(state, zoneId) {
  const f = state.flags;
  if (zoneId === "courtyard" && f.act3Complete && !f.q9Started) return { script: "doorNews" };
  if (zoneId === "threshold" && !f.throughDoor) {
    f.throughDoor = true;
    return { script: "throughDoor" };
  }
  return null;
}
