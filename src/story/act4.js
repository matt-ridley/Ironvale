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
import { learnRune } from "../rules/character.js";
import { makeItem } from "../rules/items.js";

const RACHEL = "RACHEL", HILD = "HILD", PIP = "PIP", KOBOLD = "KOBOLD", CLAIRE = "CLAIRE", MATT = "MATT", MEGAN = "MEGAN", ROBYN = "ROBYN";
export const Q9_REWARD = { gold: 500, xp: 10000 };
export const Q10_REWARD = { gold: 300, xp: 6000 };
export const BROOD_FIGHT = ["youngRedDragon", "fireElemental"];
export const Q11_REWARD = { gold: 400, xp: 8000 };
export const CINDER_FIGHT = ["cinderWarden", "cinderWarden"];
const SISTERS = ["rachel", "megan", "robyn"]; // Claire already knows
/* The first sister who has joined you but hasn't heard Matt's story yet (after quest 11), or null. */
export const untoldSister = s => (s.flags.q11Done && SISTERS.find(id => s.flags[`${id}Joined`] && !s.flags[`${id}Heard`])) || null;
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

  // Quest 11, Lastwatch: the first sight of it from the road.
  lastwatchView: {
    start: "look",
    nodes: {
      look: {
        text: "At the ash road's end stands a fort of black stone, half its towers fallen: Lastwatch, the Wardens' other home. In its west gate stand two knights in Warden plate. Fire burns behind their visors.",
        to: "claire",
      },
      claire: {
        enter: (s, ctx) => { if (!withClaire(s)) ctx.goto(null); },
        speaker: CLAIRE,
        text: "\"Father's Wardens. The Great One raised them the night Lastwatch fell, and every night they try the gate, and every night he puts them down again.\" Her jaw sets. \"Let's make it the last time.\"",
      },
    },
  },

  // The Cinder Wardens in Lastwatch's west gate.
  cinderGate: {
    start: "face",
    nodes: {
      face: {
        text: "Two Cinder Wardens bar the gate, in scorched plate, with swords that glow like coals. One lifts its blade in the old Warden salute. Then they both come at you.",
        choices: [{ label: "Fight", to: "fight" }, { label: "Back away", to: null }],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...CINDER_FIGHT], zone: "lastwatch", winFlag: "cindersBeaten", afterWin: "matt", music: "boss" }) },
    },
  },

  // Matt: meeting him (after the Cinder Wardens), his story, a scene for each daughter in your party, the Breaking Rune
  // and the true name (quest 11); then, at Lastwatch, his fire, his old jokes and an arm-wrestle.
  matt: {
    start: s => {
      if (!s.flags.q11Done) return "gate";
      const id = s.hero.companion?.id;
      return SISTERS.includes(id) && !s.flags[`${id}MetMatt`] ? id : "talk";
    },
    nodes: {
      gate: {
        enter: s => { s.flags.mattMet = true; },
        text: "The fire goes out of the Cinder Wardens at last, and the gate grinds open. A grey man limps out in scorched plate, leaning on a spear: one leg stiff, a beard like a badger's. He looks at the ashes a long time. \"Thank you. They were good lads. They hated what it made of them.\"",
        to: "sword",
      },
      sword: {
        speaker: MATT,
        text: "Then he sees your sword, and stops. \"Colleen's.\" His voice goes. \"Then the boy made it south.\" He looks at your face as if he's reading it. \"You've got her jaw. Come in. Sit. This'll take a while.\"",
        to: "claire",
      },
      claire: {
        enter: (s, ctx) => { if (!withClaire(s)) ctx.goto("story1"); },
        speaker: CLAIRE,
        text: "\"Father, this is the Warden. They're family: our brother's line, the boy Mother sent south.\" Claire drops into the ash by the fire as if she's never been away. \"Tell them. All of it.\"",
        to: "story1",
      },
      story1: {
        speaker: MATT,
        text: "\"A hundred years ago the Great One woke under the mountain, and Lastwatch burned. Colleen carried our boy out through the Door and sent him south with that sword. Then she sealed the Door to keep the dragon in. It kept us in too: me, and our four girls. Babies, all of them.\"",
        to: "story2",
      },
      story2: {
        speaker: MATT,
        text: "\"The seal stopped time this side of the Door. A hundred years went by out there, and in here, not a breath. Then, twenty-five years ago, it started to fail: gaps at the foot of the Door, a hand wide. Time started again, and the Great One woke with it. I couldn't fit through. A baby could.\"",
        to: "story3",
      },
      story3: {
        speaker: MATT,
        text: "\"So I got them out, one at a time, wherever I could reach. The twins, Rachel and Claire, to a farm family in the foothills. Robyn on the step of the shrine in Fenwatch, with a candle from our own shrine of the Dawn beside her. And Megan...\" He has to stop. \"Megan into the arms of an archer from Fenwatch, out hunting. A big man, with kind hands.\"",
        to: "story4",
      },
      story4: {
        speaker: MATT,
        text: "\"Claire came back through a gap at twelve, chasing a wolf cub, and she's been all the company I've had since. The other three...\" He looks at you, and for a moment he's afraid. \"Are they well? Tell me they're well.\"",
        to: "daughter",
      },
      daughter: {
        // A daughter in your party hears it from him; the others will hear it from you, at the keep.
        enter: (s, ctx) => {
          const id = s.hero.companion?.id;
          ctx.goto(SISTERS.includes(id) ? id : "others");
        },
      },
      others: {
        text: s => (SISTERS.some(id => s.flags[`${id}Joined`])
          ? "You tell him about them: the ones you know. He listens to every word as if it were water. \"Bring them here, if they'll come. Or tell them yourself, if they won't. They should hear it from family.\""
          : "\"Find them, if you can,\" Matt says. \"Rachel will be with books, if she's anything like she was at a year old. And tell them. They should hear it from family.\""),
        to: "rune",
      },

      // A scene for each daughter, the first time she comes to Lastwatch with you.
      rachel: {
        enter: s => { s.flags.rachelMetMatt = s.flags.rachelHeard = true; },
        speaker: RACHEL,
        text: "Rachel hasn't moved through any of it. Then she says, very carefully, as if she's reading a rune: \"You're our father.\"",
        to: "rachel2",
      },
      rachel2: {
        speaker: MATT,
        text: "\"Rachel. You were the one who never cried. Just looked at everything, like you were taking notes.\" He laughs, and his eyes are wet. \"Still taking notes, I see.\" Quill hoots, offended on her behalf, and Rachel laughs too, and then she's crying, and so is he.",
        to: "sisterDone",
      },
      megan: {
        enter: s => { s.flags.meganMetMatt = s.flags.meganHeard = true; },
        speaker: MEGAN,
        text: "Megan's knuckles are white on her bow. \"My da found me on the mountain. He always said I was a gift.\" Her voice cracks. \"He went back up there, years after, looking for where I came from.\"",
        to: "megan2",
      },
      megan2: {
        speaker: MATT,
        text: "\"Then he's a better man than I hoped, and I hoped a lot.\" He reaches out, and stops, and she takes his hand anyway. \"I named you Megan, after my mother. She could shoot the eye out of a crow at fifty paces. I'm glad he kept it.\"",
        to: "sisterDone",
      },
      robyn: {
        enter: s => { s.flags.robynMetMatt = s.flags.robynHeard = true; },
        speaker: ROBYN,
        text: "\"There was a candle beside me on the shrine step,\" Robyn says. \"The sisters kept it for me. Every Dawnfeast I lit it.\" She swallows. \"It was you.\"",
        to: "robyn2",
      },
      robyn2: {
        speaker: MATT,
        text: "\"From the shrine of the Dawn, south-east of here: the first shrine, where the Wardens lit their lamp. I lit your candle from the lamp itself.\" He looks south-east, and his face shuts. \"The light you've been praying to was your family's all along, girl. The lamp's dark now. The dead have the shrine.\"",
        to: "sisterDone",
      },
      sisterDone: { enter: (s, ctx) => ctx.goto(s.flags.q11Done ? null : "rune") },

      rune: {
        speaker: MATT,
        enter: s => { learnRune(s.hero, "breakingRune"); s.flags.breakingRune = true; },
        text: "\"Now. The Great One knows you're here, so let me give you what I've got.\" He draws a rune in the ash with the butt of his spear: the one that brought the mountain down on the pass. \"The Breaking Rune. It was ours before that scholar stole it. Strike the ground and say it, and everything in front of you feels it.\"",
        to: "learned",
      },
      learned: {
        text: "You've learned the BREAKING RUNE! (In a fight, under SKILLS: it hits every monster for 5d8 force damage, and a DEX save halves it. Nothing beyond the Door shrugs off force.)",
        to: "name",
      },
      name: {
        speaker: MATT,
        enter: s => { s.flags.trueName = true; },
        text: "\"And one more thing. Every dragon has a name it was hatched with, and it hates to hear it. I heard the Great One's once, in the frozen moment, when it was screaming at Colleen.\" He writes a word in the ash, lets you read it, then scuffs it out with his boot. \"When it tries to frighten you, say that. It can't make you afraid while you know what it is.\"",
        to: "done",
      },
      done: {
        enter: (s, ctx) => { s.flags.q11Done = true; pay(s, ctx, Q11_REWARD); },
        speaker: MATT,
        text: (s, ctx) => `"Lastwatch is yours as much as mine. Sleep by my fire whenever you like. And I'll drop the bridge: the aeries are over the gorge, and the kobolds' diggings past them." (Lastwatch is a camp now, and the north gate is open.) ${paid(ctx, Q11_REWARD)} QUEST COMPLETE: Lastwatch.`,
      },

      // At Lastwatch, after quest 11.
      talk: {
        speaker: MATT,
        enter: s => { s.flags.mattVisits = ((s.flags.mattVisits ?? -1) + 1) % 3; },
        text: s => ["\"Twenty-five years I held that gate. You'd think I'd be better company. I've been talking to the wolves. They're better listeners than Claire.\"",
          "\"Colleen used to sit right where you're sitting and complain about my cooking. She was right. It's got worse.\"",
          "\"The kobolds' diggings are over the bridge, past the aeries. There's a man down there drawing maps for them. Claire's raven says so, and Claire's raven is never wrong, unfortunately.\""][s.flags.mattVisits],
        choices: [{ label: "Ask about your Oath", to: "oath" }, { label: "Arm wrestle him", to: "wrestle" }, { label: "Leave", to: null }],
      },
      oath: {
        speaker: MATT,
        text: s => ({
          iron: "\"Sworn of Iron.\" He's quiet a moment. \"That was hers. Nothing passing while she stood. You even stand like her, feet planted, as if the ground owes you money.\"",
          storm: "\"Storm. The runes come when you call them. Colleen could never do that: she said calling a rune was like shouting at a wall. She'd have been jealous. She'd never have said so.\"",
          dawn: "\"Dawn. The old light. Our shrine's lamp was lit with it, before the dead took the shrine. Light it again one day, Warden. For me.\"",
        }[s.flags.oath] || "\"No Oath yet? Colleen took hers at sixteen. Don't tell her I said you were slow.\""),
      },
      wrestle: {
        speaker: MATT,
        text: "\"Can't spar on this leg. But the arm still works.\" He clears the old Warden table with one sweep. \"Beat me and you can have my captain's badge. Nobody has yet.\"",
        choices: [{ label: "Arm wrestle Matt", to: "play" }, { label: "Not now", to: null }],
      },
      play: { enter: (s, ctx) => ctx.emit({ type: "minigame", key: "ArmWrestle", data: { rival: "matt" } }) },
    },
  },

  // Lastwatch's north gate, barred until Matt lowers the Wardens' bridge.
  northGate: {
    start: "look",
    nodes: { look: { text: "Lastwatch's north gate, barred, and behind it the Wardens' bridge, drawn up across the gorge. Someone has kept its chains oiled." } },
  },

  // The shrine of the Dawn (Robyn's pledge comes in a later part of Act 4).
  dawnDoor: {
    start: s => (s.hero.companion?.id === "robyn" ? "robyn" : "look"),
    nodes: {
      look: {
        text: "A small stone shrine with a sun carved over the door: the Wardens' first shrine of the Dawn. The door is shut, and cold to the touch in all this heat. Something inside is breathing, slowly, though nothing in there should breathe. (The shrine's part of the story comes in a later part of Act 4.)",
      },
      robyn: {
        speaker: ROBYN,
        text: "\"I know this place.\" Robyn lays her hand flat on the door. \"I've never been here, and I know it.\" (The shrine's part of the story comes in a later part of Act 4.)",
      },
    },
  },

  // The mouth of the kobolds' diggings, over the bridge (Megan's pledge comes in a later part of Act 4).
  diggings: {
    start: s => (s.hero.companion?.id === "megan" ? "megan" : "look"),
    nodes: {
      look: {
        text: "The mouth of the kobolds' diggings, propped with old Warden beams. Candles gutter far down inside, and somewhere a man is singing, badly. (The diggings' part of the story comes in a later part of Act 4.)",
      },
      megan: {
        speaker: MEGAN,
        text: "Megan goes very still. \"That song. That's Da's old surveying song, about the cartographer's mule.\" She's halfway in before you catch her arm. (The diggings' part of the story comes in a later part of Act 4.)",
      },
    },
  },

  // Back at the keep after quest 11: you tell each sister who wasn't at Lastwatch where she came from.
  familyNews: {
    start: s => untoldSister(s) || null,
    nodes: {
      rachel: {
        enter: s => { s.flags.rachelHeard = true; },
        text: "Rachel's in the library with a book open and unread. You tell her everything: Lastwatch, Matt, the frozen years, the gap at the foot of the Door. She listens without a word. Then she shuts the book. \"He's alive.\" A long breath. \"Take me to him. Soon.\"",
        to: "next",
      },
      megan: {
        enter: s => { s.flags.meganHeard = true; },
        text: "Megan's at the archery butts. When you tell her, she lowers her bow and doesn't lift it again for a long time. \"Da knew. Or he guessed. That's why he went up the mountain.\" She wipes her eyes on her sleeve. \"Take me to him. My other da.\"",
        to: "next",
      },
      robyn: {
        enter: s => { s.flags.robynHeard = true; },
        text: "Robyn's in the chapel, lighting candles. You tell her about the candle on the shrine step, and where it came from. She sits down on a pew very suddenly. \"The light was ours,\" she whispers. \"All along.\" Then: \"I want to meet him.\"",
        to: "next",
      },
      next: { enter: (s, ctx) => ctx.goto(untoldSister(s)) },
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
  if (zoneId === "lastwatch" && f.q10Done && !f.seenLastwatch) {
    f.seenLastwatch = true;
    return { script: "lastwatchView" };
  }
  if (zoneId === "courtyard" && untoldSister(state)) return { script: "familyNews" };
  if (zoneId === "threshold" && !f.throughDoor) {
    f.throughDoor = true;
    return { script: "throughDoor" };
  }
  return null;
}
