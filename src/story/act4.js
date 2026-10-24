// Act 4, Beyond the Door: the story so far. Quest 9, Through the Door: Hild's news at the keep (the crack glows, kobolds
// pour out of the Warrens), opening the Door with the Wardenblade (its nodes are in act3.js's greatDoor), the far side
// (the Threshold, and Pip climbing out of your pack if he's had his big adventure), the kobold warband on the ash road,
// the wolves that scatter them (and carry Pip home), and the great grey wolf that leads you to the wildwood's edge.
// Quest 10, Two Halves: the wolf leads you up a trail to Claire's grove. She won't believe Rachel is real (the dragon
// has used voices before) until the charm, or the scar, proves it; then the dragon's brood attacks, and the twins fight
// beside you (the first fight with two companions: Rachel comes along as a guest if she isn't with you). Claire joins.
// The roadmap's Act 4 section has the rest. No Phaser here.
import { pay, paid } from "./rewards.js";
import { callName } from "./hero.js";
import { withRachel } from "./act3.js";
import { joinParty, COMPANIONS } from "../rules/party.js";
import { makeItem } from "../rules/items.js";

const RACHEL = "RACHEL", HILD = "HILD", PIP = "PIP", KOBOLD = "KOBOLD", CLAIRE = "CLAIRE";
export const Q9_REWARD = { gold: 500, xp: 10000 };
export const Q10_REWARD = { gold: 300, xp: 6000 };
export const BROOD_FIGHT = ["youngRedDragon", "fireElemental"];
const withClaire = s => s.hero.companion?.id === "claire";

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
  // The grey wolf at the foot of the trail: follow it up to the grove.
  wolfTrail: {
    start: "look",
    nodes: {
      look: {
        enter: s => { s.flags.wolfFollowed = true; },
        text: "The grey wolf gets up as you come and trots up the trail, looking back every few steps. You follow it uphill between the giant trees, into a clearing full of birdsong. Someone is standing by the pool.",
      },
    },
  },

  // Claire, in her grove (quest 10).
  claireMeet: {
    start: s => (s.flags.claireMet ? "again" : "wary"),
    nodes: {
      wary: {
        enter: s => { s.flags.claireMet = true; },
        speaker: CLAIRE,
        text: "\"Stop there. I know your tricks, Great One: you've worn my mother's voice before, and my sister's.\" She's barefoot, wrapped in a wolf pelt, a staff in her fist. And she has Rachel's face.",
        to: "rachel",
      },
      rachel: {
        enter: (s, ctx) => { if (!withRachel(s)) ctx.goto("rachelArrives"); },
        speaker: RACHEL,
        text: "Rachel's voice comes out very small. \"...Clary?\"",
        to: "proof",
      },
      rachelArrives: {
        speaker: RACHEL,
        text: "Running feet on the trail behind you, and an owl overhead: Rachel, out of breath. She followed you through the Door. \"...Clary?\" (Rachel joins you for this, as a guest.)",
        to: "proof",
      },
      proof: {
        enter: (s, ctx) => {
          const sun = s.hero.inventory.find(i => i.base === "sunCharm");
          if (!sun) return ctx.goto("scar");
          s.hero.inventory = [...s.hero.inventory.filter(i => i !== sun), makeItem("twinCharm")];
          s.flags.charmMended = true;
        },
        text: "Rachel holds up her half-moon. You hold out the sun half from the cairn on the pass. Claire stares at it. \"I left that on the mountain, so you'd know I was alive.\" The two halves touch, and click together, whole. (The Sun-and-Moon Charm.)",
        to: "rae",
      },
      scar: {
        speaker: RACHEL,
        text: "\"You bit me when we were six. Here.\" Rachel pulls up her sleeve: a little white scar, two neat rows of teeth. Claire stares at it, and her staff drops in the grass.",
        to: "rae",
      },
      rae: {
        speaker: CLAIRE,
        text: "\"Rae.\" Then the twins are holding on to each other, laughing and crying at once, and wolves come out of the trees to see what all the noise is.",
        to: "brood",
      },
      brood: {
        text: "Then the wolves scatter. A shadow sweeps over the grove and the treetops burst into flame: a young red dragon, one of the Great One's brood, drops into the clearing, with a living fire walking at its side.",
        choices: [{ label: "Fight beside the twins", to: "fight" }],
      },
      again: {
        speaker: CLAIRE,
        text: "\"It's back, and it's angry. Rae's with me.\" Claire's staff is up, and the trees are burning. \"Are you?\"",
        choices: [{ label: "Fight beside the twins", to: "fight" }, { label: "Not yet", to: null }],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: BROOD_FIGHT, party: ["rachel", "claire"], winFlag: "broodBeaten", afterWin: "claireJoins", music: "boss", zone: "grove" }) },
    },
  },
  // After the brood: Claire joins (and Rachel goes to wait on the roster, if she was with you).
  claireJoins: {
    start: "join",
    nodes: {
      join: {
        enter: (s, ctx) => {
          s.flags.claireJoined = true;
          s.flags.q10Done = true;
          ctx.remember("left", joinParty(s.hero, "claire"));
          pay(s, ctx, Q10_REWARD);
        },
        speaker: CLAIRE,
        text: "The brood is smoking in the treetops. Claire wipes soot off Rachel's face with her thumb, which Rachel hates, and grins at you. \"You're the Warden. The one the wolves told me about. I'm coming with you.\"",
        to: "father",
      },
      father: {
        speaker: CLAIRE,
        text: "She picks up her staff and slings it over her shoulder. \"Come on, both of you. Father will want to see you.\" Rachel stops dead.",
        to: "done",
      },
      done: {
        text: (s, ctx) => {
          const left = ctx.recall("left");
          return `Claire joins your party!${left ? ` ${COMPANIONS[left].name} will wait for you at any inn.` : ""} ${paid(ctx, Q10_REWARD)} QUEST COMPLETE: Two Halves.`;
        },
      },
    },
  },

  // A raven in the grove: only Claire understands it.
  raven: {
    start: s => (withClaire(s) ? "claire" : "look"),
    nodes: {
      look: { text: "A raven on a stump. It looks at you, says something that is definitely rude, and goes back to preening." },
      claire: {
        speaker: CLAIRE,
        text: "Claire listens with her head on one side. \"She says there are men's bones in the kobolds' diggings, east past the gorge. And one man who isn't bones yet. He draws maps for them.\"",
      },
    },
  },
  // The thicket by the grove, before Claire's shown you the way through.
  thicket: { start: "look", nodes: { look: { text: "A wall of brambles as thick as a castle gate. Something glints on the other side, but there's no way through that you can see." } } },

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
