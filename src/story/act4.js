// Act 4, Beyond the Door: the story so far. Quest 9, Through the Door: Hild's news at the keep (the crack glows, kobolds
// pour out of the Warrens), opening the Door with the Wardenblade (its nodes are in act3.js's greatDoor), the far side
// (the Threshold, and Pip climbing out of your pack if he's had his big adventure), the kobold warband on the ash road,
// the wolves that scatter them (and carry Pip home), and the great grey wolf that leads you to the wildwood's edge.
// Quest 10, Two Halves: the wolf leads you up a trail to Claire's grove. She won't believe Rachel is real (the dragon
// has used voices before) until the charm, or the scar, proves it; then the dragon's brood attacks, and the twins fight
// beside you (the first fight with two companions: Rachel comes along as a guest if she isn't with you). Claire joins.
// Quest 11, Lastwatch: the Cinder Wardens at the gate, then Matt, the sisters' father: his story, a scene for each
// daughter (at Lastwatch, or from you at the keep), the Breaking Rune and the Great One's true name. After it, his fire
// is a camp, and his bridge north opens the aeries and the kobolds' diggings.
// The sisters' pledges: the Mapmaker (Megan finds Dunstan in the kobolds' diggings), the First Light (Robyn relights
// the shrine of the Dawn), Claire's at Matt's fire, their banners in the keep, and each Oath's path to its vault.
// Quest 12, the Emberdeep: the dragon's mountain, through the golem hall or round it (Dunstan's red tunnel, Snik's
// kobold tunnel), the Wardens' lost forge (Brannoc, and the Wardenblade's final form), and the hoard's doors.
// The roadmap's Act 4 section has the rest. No Phaser here.
import { pay, paid } from "./rewards.js";
import { callName } from "./hero.js";
import { withRachel } from "./act3.js";
import { joinParty, COMPANIONS, knownSpells } from "../rules/party.js";
import { DRAGON_ARROWS } from "../rules/tactics.js";
import { learnRune } from "../rules/character.js";
import { makeItem } from "../rules/items.js";

const RACHEL = "RACHEL", HILD = "HILD", PIP = "PIP", KOBOLD = "KOBOLD", CLAIRE = "CLAIRE", MATT = "MATT", MEGAN = "MEGAN", ROBYN = "ROBYN", DUNSTAN = "DUNSTAN", BRANNOC = "BRANNOC";
export const Q9_REWARD = { gold: 500, xp: 10000 };
export const Q10_REWARD = { gold: 300, xp: 6000 };
export const BROOD_FIGHT = ["youngRedDragon", "fireElemental"];
export const Q11_REWARD = { gold: 400, xp: 8000 };
export const CINDER_FIGHT = ["cinderWarden", "cinderWarden"];
const SISTERS = ["rachel", "megan", "robyn"]; // Claire already knows
/* The first sister who has joined you but hasn't heard Matt's story yet (after quest 11), or null. */
// The sisters' pledges (step 25): Megan's (the Mapmaker) and Robyn's (the First Light), then Claire's; and the Oath
// paths, each to a vault of Oath gear.
export const PLEDGE_REWARD = { gold: 300, xp: 5000 };
export const VAULT_REWARD = { gold: 0, xp: 3000 };
export const DIGGINGS_FIGHT = ["salamander", "hellHound"];
export const SHRINE_FIGHT = ["vampireSpawn", "wraith"];
export const SHRINE_ROUNDS = 4;
export const IRON_SPAN_DC = 16;
const SPAN_SLIP = 10, CURSE_BURN = 8;
export const VAULTS = { iron: "towerShield", storm: "stormGlass", dawn: "dawnBanner" };
const VAULT_TEXT = {
  iron: "Inside, wrapped in oilcloth: the Wardens' tower shield, a tower on its face. (The WARDENS' TOWER SHIELD: +4 AC, and fire does you half while it's on your arm. Equip it from your bag.)",
  storm: "Inside, in a nest of wool: a rune stone of clear glass with a storm trapped in it. (The STORM-GLASS RUNE STONE: your Chain Lightning leaps once more. It works from your pack.)",
  dawn: "Inside, folded small: the Wardens' old banner of the Dawn, gold on white. (The DAWN BANNER: your healing light shines twice as bright. It works from your pack.)",
};
const withCompanion = (s, id) => s.hero.companion?.id === id;
/* A companion's record, whether they're with you or waiting on the roster. */
const recordOf = (hero, id) => (hero.companion?.id === id ? hero.companion : hero.roster?.find(r => r.id === id)) || null;
/* Opens your Oath's vault: its gear, and the XP. */
function openVault(s, ctx, oath) {
  s.flags[`${oath}Vault`] = true;
  s.hero.inventory.push(makeItem(VAULTS[oath]));
  pay(s, ctx, VAULT_REWARD);
}
const vaultText = (oath, ctx) => `${VAULT_TEXT[oath]} ${paid(ctx, VAULT_REWARD).replace("+0 gold, ", "")} OATH VAULT FOUND.`;
/* True once every sister who's joined you has pledged (Rachel's came with the charm): then Claire pledges. */
export const sistersPledged = f => !!f.q10Done && (!f.meganJoined || !!f.meganPledged) && (!f.robynJoined || !!f.robynPledged);

// Quest 12, the Emberdeep (step 26).
export const Q12_REWARD = { gold: 1000, xp: 15000 };
export const GOLEM_FIGHT = ["clayGolem", "stoneGolem"];
export const HOARD_GUARDS = ["fireGiant", "hellHound"];
const hasItem = (s, base) => s.hero.inventory.some(i => i.base === base);
/* Brannoc can read the lost forge's runes by the twins' charm's light, or with one of the twins to read them out. */
export const canReadForge = s => hasItem(s, "twinCharm") || withCompanion(s, "rachel") || withCompanion(s, "claire");
/* Past the golem hall: through the golems, round by Dunstan's red tunnel, or in by Snik's. */
export const pastGolems = f => !!(f.golemsBeaten || f.redTunnel || f.snikWay);

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

  // The First Light (Robyn's pledge): the shrine of the Dawn, its door shut on the dead inside. Robyn relights the
  // lamp and holds the light while you hold off the dead (a waystone-style trial: survive SHRINE_ROUNDS rounds).
  dawnDoor: {
    start: s => (withCompanion(s, "robyn") ? "robyn" : "look"),
    nodes: {
      look: {
        text: "A small stone shrine with a sun carved over the door: the Wardens' first shrine of the Dawn. The door is shut, and cold to the touch in all this heat. Something inside is breathing, slowly, though nothing in there should breathe. (This one is Robyn's to open: bring her.)",
      },
      robyn: {
        speaker: ROBYN,
        text: "\"I know this place.\" Robyn lays her hand flat on the door. \"I've never been here, and I know it.\"",
        choices: [{ label: "Open the door", to: "inside" }, { label: "Not yet", to: null }],
      },
      inside: {
        text: "The shrine is cold and dark. On the altar stands a great bronze lamp, dry for twenty-five years, and round it the dead of the barrow-fields have made a nest: a vampire spawn, and a wraith coiled in the rafters like smoke. Robyn walks straight past them to the lamp.",
        to: "light",
      },
      light: {
        speaker: ROBYN,
        text: `"Keep them off me. I only have to keep it lit." She strikes a light, the lamp catches, and the dead turn on it, screaming. (Hold them off for ${SHRINE_ROUNDS} rounds while Robyn keeps the light.)`,
        choices: [{ label: "Hold the line", to: "fight" }, { label: "Get out!", to: null }],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...SHRINE_FIGHT], surviveRounds: SHRINE_ROUNDS, zone: "dawnShrine", afterWin: "firstLight", music: "boss" }) },
    },
  },
  firstLight: {
    start: "light",
    nodes: {
      light: {
        text: "The lamp blazes up white and gold, and the dead come apart like ash in a wind. Then the light settles, warm as a hearth, into every corner of the shrine.",
        to: "robyn",
      },
      robyn: {
        speaker: ROBYN,
        text: "\"It's the same light.\" Robyn is laughing and crying at once. \"The candle on the step, the shrine in Fenwatch, the chapel on the pass. It was always this one. It was always ours.\"",
        to: "learn",
      },
      learn: {
        enter: s => {
          const r = recordOf(s.hero, "robyn");
          if (r) r.spells = [...new Set([...knownSpells(r), "massHealingWord"])];
        },
        text: "The light pours into her, and she knows a new prayer: one word, and everyone it reaches is healed. (Robyn learned MASS HEALING WORD! Everyone in your party heals at once. By herself, on HEAL, she says it when two of you are badly hurt.)",
        to: "pledge",
      },
      pledge: {
        enter: (s, ctx) => { s.flags.robynPledged = true; pay(s, ctx, PLEDGE_REWARD); },
        speaker: ROBYN,
        text: (s, ctx) => `"I'll keep the light for the end. Wherever you go to face it, I'll be there, holding it up." (ROBYN PLEDGES to stand at the last fight. Her banner will hang in the keep's hall.) ${paid(ctx, PLEDGE_REWARD)} PLEDGE: The First Light.`,
      },
    },
  },
  // The shrine's lamp, lit again: a full heal for you and the friend with you.
  dawnLamp: {
    start: "look",
    nodes: {
      look: {
        enter: s => { s.hero.hp = s.hero.maxHp; if (s.hero.companion) s.hero.companion.hurt = 0; },
        text: "The lamp of the Dawn burns steady on the altar. In its light your wounds close, and your friend's too. (You're both healed.)",
      },
    },
  },

  // The Mapmaker (Megan's pledge): the kobolds' diggings, over the bridge. Someone down there is singing Corwin's old
  // surveying song: Dunstan, his partner, taken off the pass ten years ago.
  diggings: {
    start: s => (s.flags.meganPledged ? "empty" : withCompanion(s, "megan") ? "megan" : "look"),
    nodes: {
      look: {
        text: "The mouth of the kobolds' diggings, propped with old Warden beams. Candles gutter far down inside, and somewhere a man is singing, badly, a song about a mule. (This one is Megan's to find: bring her.)",
      },
      megan: {
        speaker: MEGAN,
        text: "Megan goes very still. \"That song. That's Da's old surveying song, about the cartographer's mule.\" She's halfway in before you catch her arm.",
        choices: [{ label: "Go in with her", to: "inside" }, { label: "Not yet", to: null }],
      },
      inside: {
        text: "The tunnel drops into a cavern lit by candle-stubs, and kobolds scatter squealing. Chained to a drawing table in the middle sits a thin man with a grey beard and cracked spectacles. Between you and him stand the Great One's overseers: a salamander, and a hell hound on a chain.",
        choices: [{ label: "Fight", to: "fight" }, { label: "Back out", to: null }],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...DIGGINGS_FIGHT], zone: "warrens", winFlag: "diggingsCleared", afterWin: "dunstanFreed", music: "boss" }) },
      empty: { text: "The diggings are quiet now. The kobolds have gone deeper, towards their Great One, and taken their candles with them." },
    },
  },
  dunstanFreed: {
    start: "free",
    nodes: {
      free: {
        speaker: DUNSTAN,
        text: "The man at the table squints at you over his spectacles. \"You're not kobolds. You're far too tall.\" Then he sees Megan, and the pen falls out of his hand. \"...Little Meg? Corwin's Meg?\"",
        to: "megan",
      },
      megan: {
        speaker: MEGAN,
        text: "\"Uncle Dunstan?\" She's on her knees beside him, sawing at the chain. \"You went up the pass with Da. He came back. You didn't. We thought...\"",
        to: "story",
      },
      story: {
        speaker: DUNSTAN,
        text: "\"The kobolds took me off the pass the night your da and I split up to search. Dragged me through their tunnels to here, and kept me alive because I can draw. Ten years of maps.\" He laughs, a little wildly. \"I've drawn every tunnel in that mountain.\"",
        to: "letter",
      },
      letter: {
        enter: s => { s.hero.inventory.push(makeItem("corwinsLetter")); },
        speaker: DUNSTAN,
        text: "He digs in his coat and brings out a letter, gone soft as cloth with folding. \"Your da gave me this before we went up. In case. I've kept it dry for ten years.\" (Corwin's Letter.)",
        to: "read",
      },
      read: {
        speaker: MEGAN,
        text: "Megan reads it twice, then out loud, because she can't keep it in: \"Meg. If you're reading this, I never found where you came from. It doesn't matter. You came from me, and your ma, and our hearth. Whoever had you first loved you: I could tell by how you were wrapped. Shoot straight. Da.\"",
        to: "gift",
      },
      gift: {
        enter: s => {
          s.hero.inventory.push(makeItem("dunstansMap"));
          const m = recordOf(s.hero, "megan");
          if (m) m.dragonArrows = DRAGON_ARROWS;
        },
        speaker: DUNSTAN,
        text: "\"Now. Two things I took off them.\" He presses a rolled map into your hands: the Emberdeep, every tunnel, one marked in red. \"That one goes round their golems.\" And to Megan, a quiver with three black arrows, their heads etched with a dragon's skull. \"They were saving these for someone. Let's give them someone.\" (Dunstan's Map. Megan has three ARROWS OF DRAGON SLAYING: a dragon she hits makes a CON save or takes 6d10 more.)",
        to: "pledge",
      },
      pledge: {
        enter: (s, ctx) => { s.flags.meganPledged = true; pay(s, ctx, PLEDGE_REWARD); },
        speaker: MEGAN,
        text: (s, ctx) => `Megan slings the quiver over her shoulder and looks up at the mountain, smoking over the aeries. "When you go up there, I'm going with you. For Da. For both of them." (MEGAN PLEDGES to stand at the last fight. Her banner will hang in the keep's hall.) ${paid(ctx, PLEDGE_REWARD)} PLEDGE: The Mapmaker.`,
      },
    },
  },
  // Dunstan at Lastwatch afterwards, drawing Matt the Emberdeep.
  dunstan: {
    start: "hello",
    nodes: {
      hello: {
        speaker: DUNSTAN,
        enter: s => { s.flags.dunstanVisits = ((s.flags.dunstanVisits ?? -1) + 1) % 2; },
        text: s => ["\"Matt and I are going over the map. He says the red tunnel's the one. He also says my drawing of the dragon is unkind. It's accurate.\"",
          "\"Corwin's going to fall over when he sees me. Don't tell him I'm coming. I want to see his face.\""][s.flags.dunstanVisits],
      },
    },
  },

  // Claire's pledge: once every sister with you has pledged (Rachel's came with the charm), at Matt's fire.
  clairePledge: {
    start: "fire",
    nodes: {
      fire: { text: "Claire is waiting at Matt's fire, the twins' charm in her fist.", to: "claire" },
      claire: {
        speaker: CLAIRE,
        text: "\"Megan's pledged. Robyn's pledged. Rae pledged the night we found each other, she just didn't say it out loud.\" She grins. \"That's all of us. All four. Father says Mother would have cried.\"",
        to: "matt",
      },
      matt: { speaker: MATT, text: "\"She would have. Then she'd have said she had ash in her eye.\"", to: "pledge" },
      pledge: {
        enter: s => { s.flags.clairePledged = true; },
        speaker: CLAIRE,
        text: "\"So here's mine. When it comes down on us, and it will, I'll get whoever falls back up. Every time.\" (CLAIRE PLEDGES to stand at the last fight: once in each part of it, she'll bring a fallen friend back. Her banner will hang in the keep's hall.)",
      },
    },
  },

  // The pledge banners in the keep's hall.
  pledgeBanner: {
    start: "look",
    nodes: {
      look: {
        text: (s, ctx) => ({
          rachel: "Rachel's banner: a silver moon on deep blue, with the twins' charm stitched under it. She pledged the night the twins found each other, she says, she just didn't make a speech about it.",
          megan: "Megan's banner: a gold arrow on green, and under it, in Corwin's hand, copied from his letter: SHOOT STRAIGHT.",
          robyn: "Robyn's banner: a gold sun on white, the lamp of the Dawn. It seems to glow a little, even at night.",
          claire: "Claire's banner: a green wolf's head on grey. She stitched it herself. The wolf is grinning.",
          brannoc: "Brannoc's banner: an iron anvil on red. \"Not a sister,\" he says, \"but I'm not missing it.\"",
        }[ctx.object?.who] || "A banner."),
      },
    },
  },

  // The Oath of Storm's path: a rune stone at the edge of a lava lake, and the vault on its islet.
  stormStone: {
    start: s => (s.flags.oath === "storm" && !s.flags.stormVault ? "call" : "look"),
    nodes: {
      look: {
        text: s => (s.flags.stormVault ? "The rune stone hums at you, friendly, like a cat." : "A Warden rune stone at the edge of a lava lake, its rune shaped like a lightning-fork. On an islet in the middle of the lake sits an iron-bound chest. Much too far to jump."),
      },
      call: {
        text: "The rune on the stone sparks as you come near, and your blade sparks back. On an islet in the lava lake sits an iron-bound chest. The runes answer when you call.",
        choices: [{ label: "Blink across", to: "over" }, { label: "Not now", to: null }],
      },
      over: {
        enter: (s, ctx) => openVault(s, ctx, "storm"),
        text: (s, ctx) => `You call, and the world folds: one step and you're on the islet with the lake roaring round you, one more and you're back with the chest under your arm. ${vaultText("storm", ctx)}`,
      },
    },
  },
  // The Oath of Dawn's path: the cursed gate in Lastwatch's old tower, and the vault behind it.
  cursedGate: {
    start: s => (s.flags.oath === "dawn" ? "dawn" : "burn"),
    nodes: {
      burn: {
        enter: s => { s.hero.hp = Math.max(1, s.hero.hp - CURSE_BURN); },
        text: `An iron gate across the door of Lastwatch's old tower, crusted with black runes. You reach for it, and it burns like a forge: -${CURSE_BURN} HP. Behind it, something gleams.`,
      },
      dawn: {
        enter: s => { s.flags.dawnGateOpen = true; },
        text: "The black runes flinch from you. When you take hold of the gate the fire in it goes out like a blown candle, and it swings open. What is dead shall not pass; what is Dawn may.",
      },
    },
  },
  // An Oath vault's chest (the Dawn's, behind the cursed gate).
  oathVault: {
    start: "open",
    nodes: {
      open: {
        enter: (s, ctx) => openVault(s, ctx, ctx.object?.oath || s.flags.oath),
        text: (s, ctx) => vaultText(ctx.object?.oath || s.flags.oath, ctx),
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

  // Quest 12, the Emberdeep: the first steps inside.
  emberdeepView: {
    start: "look",
    nodes: {
      look: {
        text: "The gate under the mountain opens on a cave the size of a cathedral, lit red from below. Kobold tunnels run off in every direction, and the air shakes with something breathing, far above. The Emberdeep.",
        to: "claire",
      },
      claire: {
        enter: (s, ctx) => { if (!withCompanion(s, "claire")) ctx.goto(null); },
        speaker: CLAIRE,
        text: "\"Father says the Wardens dug half of this, before it was the Great One's. Their forge is up there somewhere, and their golems.\" She sniffs. \"And it knows we're here.\"",
      },
    },
  },

  // The golem hall's north door: a clay golem and a stone golem, Warden-made, the dragon's now.
  golems: {
    start: "face",
    nodes: {
      face: {
        text: s => `Two shapes stand in the golem hall's north door: a golem of red clay and one of grey stone, runes burning in their chests. Warden-made, to guard the forge; the Great One's now. They turn their heads as one.${hasItem(s, "dunstansMap") ? " (Dunstan's map has a red line round this hall, up the west side.)" : ""}`,
        choices: [{ label: "Fight", to: "fight" }, { label: "Back away", to: null }],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...GOLEM_FIGHT], zone: "golemHall", winFlag: "golemsBeaten", afterWin: "golemsFall", music: "boss" }) },
    },
  },
  golemsFall: { start: "fall", nodes: { fall: { text: "The golems' runes gutter out, and they settle where they stand like old statues. Behind them, steps climb into the heat." } } },

  // Dunstan's red tunnel: a crack in the tunnels' west wall, round the golem hall.
  redCrack: {
    start: s => (hasItem(s, "dunstansMap") ? "map" : "look"),
    nodes: {
      look: { text: "A crack in the west wall, just wide enough for a kobold, breathing warm air. It could go anywhere. Without a map, it probably goes nowhere good." },
      map: {
        enter: s => { s.flags.redTunnel = true; },
        text: "Dunstan's map: his red line runs right through this crack and up the west side of the mountain, round the golem hall. You squeeze through, and the tunnel opens out beyond. (Dunstan's back way is open.)",
      },
    },
  },

  // The Wardens' lost forge: cold until Brannoc comes; then his, and the Wardenblade's final form.
  lostForge: {
    start: s => (s.flags.brannocAtForge ? "brannoc" : "cold"),
    nodes: {
      cold: {
        enter: s => { s.flags.lostForgeFound = true; },
        text: "The Wardens' lost forge, cold and black for a hundred years: an anvil as big as a cart, bellows of dragon-leather, and runes cut into every stone, too worn to read by this light. Brannoc would weep. Brannoc should see this. (Tell him at the keep.)",
      },
      brannoc: {
        speaker: BRANNOC,
        text: s => (s.hero.bladeForm >= 3
          ? "\"Best forge I ever stood at, and I've stood at a few. Same as ever, lad: gear to +5, and silver.\""
          : "\"Look at it. LOOK at it. The Wardens' own forge, and the fire took first time, like it was waiting.\" He pats the anvil like a horse. \"Give me that blade. This is where it was meant to be finished.\""),
        choices: [
          { label: "Reforge the Wardenblade", if: s => !(s.hero.bladeForm >= 3), to: "reforge" },
          { label: "Let's see the forge", to: "shop" },
          { label: "Goodbye.", to: null },
        ],
      },
      shop: { enter: (s, ctx) => ctx.emit({ type: "shop", shop: s.flags.oath === "iron" ? "forgeIron" : "forge" }) },
      reforge: {
        enter: (s, ctx) => {
          if (!s.hero.inventory.some(i => i.base === "wardenblade") && s.hero.equipment.weapon?.base !== "wardenblade") return ctx.goto("noBlade");
          if (!canReadForge(s)) ctx.goto("dark");
        },
        speaker: BRANNOC,
        text: s => (hasItem(s, "twinCharm")
          ? "\"The runes on this forge are written in light, not ink.\" He holds up the twins' charm, and it glows sun-gold and moon-silver, and the runes on every stone light up to answer it. \"There. Now I can read it.\""
          : `"The runes on this forge are written in light, not ink." ${withCompanion(s, "rachel") ? "Rachel" : "Claire"} reads them out for him, one by one, while he works.`),
        to: "final",
      },
      dark: {
        speaker: BRANNOC,
        text: "\"The runes on this forge are written in light, not ink, and I can't read them in this murk. That charm of the twins' glows, they tell me. Or bring one of those two girls: they could read them for me.\"",
      },
      noBlade: { speaker: BRANNOC, text: "\"Where's the blade, lad? I can't finish what you haven't brought.\"" },
      final: {
        enter: (s, ctx) => { s.hero.bladeForm = 3; s.flags.bladeFinalForm = true; s.flags.brannocPledged = true; },
        text: s => `All night the old forge roars. At dawn Brannoc lifts the Wardenblade out of the quench, and every rune down its length is lit at once, one more than before. The Wardenblade's FINAL FORM: one more rune slot, and while it's in your hand, fire does you half. "When you go through those doors," Brannoc says, with a nod up at the hoard, "I'll be holding them with Matt. A dwarf owes a forge that much, ${callName(s.hero) || "lad"}." (BRANNOC PLEDGES. His banner will hang in the keep's hall.)`,
      },
    },
  },

  // The hoard's last guards, in the antechamber's door.
  hoardGuards: {
    start: "face",
    nodes: {
      face: {
        text: "In the antechamber's door stands the hoard's last guard: a fire giant in black iron, its beard alight, with a hell hound on a chain as thick as your arm. The giant lifts a greatsword as long as you are, and lets the chain go.",
        choices: [{ label: "Fight", to: "fight" }, { label: "Back away", to: null }],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...HOARD_GUARDS], zone: "hoardDoors", winFlag: "hoardGuardsBeaten", music: "boss" }) },
    },
  },

  // The hoard's doors: only the Wardenblade's final form wakes their runes. Opening them ends quest 12.
  hoardDoor: {
    start: s => (s.flags.q12Done ? "ajar" : s.hero.bladeForm >= 3 ? "open" : "sealed"),
    nodes: {
      sealed: {
        text: "The hoard's doors: two leaves of black iron as tall as the keep's walls, Warden runes down one side and kobold scratchings down the other. You lay the Wardenblade against them, and the runes stir and go dark again. Something the blade needs is missing. (The Wardens' lost forge?)",
      },
      open: {
        enter: (s, ctx) => { s.flags.q12Done = true; pay(s, ctx, Q12_REWARD); },
        text: (s, ctx) => `You lay the Wardenblade against the doors, and every Warden rune on them lights at once. They grind open a hand's width, and the heat that comes out of the gap could melt a sword. In the gold-red dark beyond, something enormous breathes in, and stops. ${paid(ctx, Q12_REWARD)} QUEST COMPLETE: The Emberdeep.`,
        to: "next",
      },
      next: { text: "(The last part of Act 4, the Great One, is coming.)" },
      ajar: { text: "Through the gap in the hoard's doors: heat, gold-light, and breathing. (The last part of Act 4 is coming.)" },
    },
  },

  // The end of the road, at the lip of the gorge. The Oath of Iron's path: hold up a span of the broken bridge (three
  // STR checks in a row) while your friends cross, to the vault in the far pier.
  gorgeEdge: {
    start: "look",
    nodes: {
      look: {
        text: s => `The road ends at the lip of a gorge. Far below, a river of fire. The Wardens' old bridge lies in pieces down there, its broken piers still standing. Across it the land is burned black, all the way north to a mountain that smokes.${s.flags.oath === "iron" && !s.flags.ironVault ? " The piers are sound. Someone strong enough could hold a span of it up, for a moment." : ""}`,
        choices: [{ label: "Hold up the span", if: s => s.flags.oath === "iron" && !s.flags.ironVault, to: "climb" }, { label: "Leave it", to: null }],
      },
      climb: {
        text: "You climb down to the nearest pier, set your shoulder under the fallen span and heave. It comes up groaning. Your friends start across. It slips. It slips again.",
        to: "lift1",
      },
      lift1: { enter: (s, ctx) => { if (!ctx.check("STR", IRON_SPAN_DC, { proficient: true }).success) ctx.goto("slip"); }, text: (s, ctx) => `You hold it. ${ctx.checkText}`, to: "lift2" },
      lift2: { enter: (s, ctx) => { if (!ctx.check("STR", IRON_SPAN_DC, { proficient: true }).success) ctx.goto("slip"); }, text: (s, ctx) => `You hold it again. ${ctx.checkText}`, to: "lift3" },
      lift3: { enter: (s, ctx) => { if (!ctx.check("STR", IRON_SPAN_DC, { proficient: true }).success) ctx.goto("slip"); }, text: (s, ctx) => `And again, until the last of them is over. ${ctx.checkText}`, to: "across" },
      slip: {
        enter: s => { s.hero.hp = Math.max(1, s.hero.hp - SPAN_SLIP); },
        text: (s, ctx) => `${ctx.checkText} The span slides off your shoulder into the fire in a shower of sparks, and everyone scrambles back. (-${SPAN_SLIP} HP)`,
        choices: [{ label: "Try again", to: "climb" }, { label: "Leave it", to: null }],
      },
      across: {
        enter: (s, ctx) => openVault(s, ctx, "iron"),
        text: (s, ctx) => `The span holds. In the far pier, behind a Warden seal shaped like a tower: a cache. ${vaultText("iron", ctx)}`,
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
  if (zoneId === "lastwatchHold" && f.q11Done && f.claireJoined && !f.clairePledged && (f.meganPledged || f.robynPledged) && sistersPledged(f)) return { script: "clairePledge" };
  if (zoneId === "tunnels" && !f.enteredEmberdeep) {
    f.enteredEmberdeep = true;
    return { script: "emberdeepView" };
  }
  if (zoneId === "threshold" && !f.throughDoor) {
    f.throughDoor = true;
    return { script: "throughDoor" };
  }
  return null;
}
