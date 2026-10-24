// The conversations in the game so far: Elder Maren's two quests (the goblin chief, then the Goblin King), Pip,
// Old Tom the fisher, the fallen oak, the goblin cave, chests, the iron gate and the Goblin King, and inside the
// houses: Maren's journal, Hazel (Pip's mum) and Old Tom's spare bed. And resting: Nell at the Sleeping Fox inn (a
// long rest for gold) and the campfire at Goblin Rocks (a free short rest). Then the start of Act 2 (quest 3, the Iron
// Signet): the King's last words, the ring on his throne, Brannoc the smith, and what Maren makes of the ring. The
// ring's crest is the one on the hero's sword: the first hints that the hero is of the Wardens' blood.
import { gainXp, rest, shortRest, reforgeBlade, learnRune } from "../rules/character.js";
import { makeItem, itemName } from "../rules/items.js";
import { joinParty, companionStats, benchCompanion, takeCompanion, arcaneRecovery, COMPANIONS } from "../rules/party.js";
import { tileOf, feetAt } from "../world/movement.js";
import { DEEP_CAVE } from "../world/cave.js";
import { callName, titleOf, actOf } from "./hero.js";
import { hubById } from "../world/travel.js";
import { GAME_SCRIPTS } from "./minigames.js";
import { BOUNTIES, boardFor, currentBounty, takeBounty, claimBounty, dropBounty, bountyLine } from "./bounties.js";
import { talkNodes, afterRest } from "./talks.js";
import { pay, paid } from "./rewards.js";
import { ACT3_SCRIPTS, tremorNode, scoutNode, withRachel, stonesFound, PIP_REWARD, GNASHER_REWARD, nettleHaunting } from "./act3.js";
import { ACT4_SCRIPTS } from "./act4.js";

/* ", Mary" when the hero has a name, else nothing: for lines like `You did it${comma(s)}!`. */
const comma = s => (callName(s.hero) ? `, ${callName(s.hero)}` : "");

export const QUEST_REWARD = { gold: 100, xp: 300 };
export const KING_REWARD = { gold: 250, xp: 1000 };
export const LOG_CHECKS = { shove: { ability: "STR", dc: 12 }, climb: { ability: "DEX", dc: 14 } };
export const GATE_CHECKS = { shove: { ability: "STR", dc: 13 }, climb: { ability: "DEX", dc: 15 } };
export const BOSS_FIGHT = ["goblinChief", "goblin"];
export const KING_FIGHT = ["goblinKing"];
export const INN_COST = 10; // a night at the Sleeping Fox (each hub's innCost, in travel.js)
export const SIGNET_REWARD = { gold: 150, xp: 1500 }; // quest 3, for reaching Greywater Fen and telling Maren
export const CAUSEWAY_REWARD = { gold: 200, xp: 3000 }; // quest 4, when the causeway rises
export const SALLOW_FIGHT = ["motherSallow"];


const ELDER = "ELDER MAREN";
const BRANNOC = "BRANNOC";
const SALLOW = "MOTHER SALLOW";
const ROBYN = "ROBYN";
const VARRIC = "LORD VARRIC";
export const VARRIC_FIGHT = ["lordVarric"];
export const KEEP_REWARD = { gold: 500, xp: 5000 }; // quest 5, when the Signet goes home
export const GRAVES_FIGHT = ["ghoul", "ghoul"];
export const KEEP_CHECKS = { lift: { ability: "STR", dc: 15 }, winch: { ability: "DEX", dc: 13 } };
export const LOCK_CHECKS = { force: { ability: "STR", dc: 14 }, loose: { ability: "DEX", dc: 14 } };
export const LOCKS = ["courtyardLever", "chapelSeal", "armouryLever"];
/* How many of the tomb door's three locks are open. */
export const locksOpen = flags => LOCKS.filter(f => flags[f]).length;
export const CHAIN_CHECKS = { smash: { ability: "STR", dc: 12 }, pick: { ability: "DEX", dc: 12 } };

export const SCRIPTS = {
  ...GAME_SCRIPTS, // knucklebones, arm wrestling, archery and fishing (story/minigames.js)
  ...ACT3_SCRIPTS, // the pass: Rachel, the rune-stones, the carvings (story/act3.js)
  ...ACT4_SCRIPTS, // beyond the Door (story/act4.js)
  elder: {
    start: s => {
      const f = s.flags;
      if (f.q9Done) return "homeland"; // Act 4
      if (f.kingRewarded) return f.seenFen && f.signetShown && !f.fenReported ? "fenReport" : f.signetShown ? "ironvale" : f.signetTaken ? "signet" : "afterAll";
      if (f.kingDefeated) return "kingThanks";
      if (f.questRewarded) return f.kingQuestStarted ? "kingReminder" : "kingIntro";
      return f.chiefDefeated ? "thanks" : f.questStarted ? "reminder" : "intro";
    },
    nodes: {
      intro: {
        speaker: ELDER,
        text: "Ah, a traveller with a sword! Goblins have been raiding Oakhollow from a cave past the Whispering Wood.",
        choices: [
          { label: "What do you need?", to: "ask" },
          { label: "Not my problem.", to: "later" },
        ],
      },
      ask: {
        speaker: ELDER,
        text: "Their chief has holed up in the cave beyond Goblin Rocks. Drive him out and Oakhollow will reward you well.",
        choices: [
          { label: "I'll do it.", to: "accept" },
          { label: "Maybe later.", to: "later" },
        ],
      },
      accept: {
        speaker: ELDER,
        enter: s => { s.flags.questStarted = true; },
        text: "Bless you! Go east over the bridge and follow the path through the wood. A fallen oak blocks the way, I'm told. You'll need strong arms or nimble feet.",
        to: "advice",
      },
      advice: {
        speaker: ELDER,
        text: s => (s.hero.level < 2
          ? "And forgive me, but you look a little green. Hunt in the wood until you're stronger, and see our blacksmith. A sharp blade helps."
          : "See our blacksmith before you go. A sharp blade helps."),
      },
      later: { speaker: ELDER, text: "Hmph. The goblins won't wait forever." },
      reminder: {
        speaker: ELDER,
        text: s => `The goblin chief still lurks in the cave past Goblin Rocks.${s.hero.level < 2 ? " Hunt in the wood a while first; you'll need your strength." : ""} Come back when he's dealt with.`,
      },
      thanks: {
        speaker: ELDER,
        enter: (s, ctx) => {
          const before = s.hero.level;
          s.hero.gold += QUEST_REWARD.gold;
          gainXp(s.hero, QUEST_REWARD.xp, ctx.rng);
          s.flags.questRewarded = true;
          ctx.remember("newLevel", s.hero.level > before ? s.hero.level : null);
        },
        text: (s, ctx) => (s.flags.questStarted ? `You did it${comma(s)}! The chief is gone!` : "The goblin chief, gone? And I hadn't even asked you yet!")
          + ` Please, take this: ${QUEST_REWARD.gold} gold. (+${QUEST_REWARD.xp} XP${ctx.recall("newLevel") ? `, level ${ctx.recall("newLevel")}!` : ""})`,
        to: "kingIntro",
      },
      kingIntro: {
        speaker: ELDER,
        text: "But I fear it isn't over. The chief was only a servant. Behind his throne, a tunnel runs deep under the hills, to the Goblin King himself.",
        choices: [
          { label: "I'll find the King.", to: "kingAccept" },
          { label: "Not yet.", to: "kingLater" },
        ],
      },
      kingAccept: {
        speaker: ELDER,
        enter: s => { s.flags.kingQuestStarted = true; },
        text: "Brave heart! Go back into the cave and follow the tunnels to the very end. They say an iron gate guards his hall.",
        to: "kingAdvice",
      },
      kingAdvice: {
        speaker: ELDER,
        text: "Visit the apothecary by the crossroads first. A Potion of Dexterity gives you an extra blow every time you swing, and you'll want it against the King.",
      },
      kingLater: { speaker: ELDER, text: "Rest, then. But come back to me. The King won't sit still for ever." },
      kingReminder: {
        speaker: ELDER,
        text: s => `The Goblin King waits at the end of the tunnels behind the cave.${s.hero.level < 4 ? " Explore Willowmere to the south and grow stronger first." : ""} Come back when he's beaten.`,
      },
      kingThanks: {
        speaker: ELDER,
        enter: (s, ctx) => {
          const before = s.hero.level;
          s.hero.gold += KING_REWARD.gold;
          gainXp(s.hero, KING_REWARD.xp, ctx.rng);
          s.flags.kingRewarded = true;
          ctx.remember("newLevel", s.hero.level > before ? s.hero.level : null);
        },
        text: (s, ctx) => `The Goblin King, beaten! Oakhollow will sing about ${callName(s.hero) || "you"} for a hundred years.`
          + ` Take this: ${KING_REWARD.gold} gold. (+${KING_REWARD.xp} XP${ctx.recall("newLevel") ? `, level ${ctx.recall("newLevel")}!` : ""})`,
        to: "afterKing",
      },
      afterKing: { enter: (s, ctx) => ctx.goto(s.flags.signetTaken ? "signet" : null) },
      // Quest 3: the Iron Signet.
      signet: {
        speaker: ELDER,
        text: "What's that on your finger? Show me... By the old stones. That's the seal of Ironvale Keep, a fortress past the marshes to the east. Empty for a hundred years. Its lords were called the Wardens.",
        to: "crest",
      },
      crest: {
        speaker: ELDER,
        text: "She looks from the ring to your sword, and back. \"The same crest. Where did you get that blade?\"",
        choices: [
          { label: "I've always had it.", to: "blood" },
          { label: "I don't know.", to: "blood" },
        ],
      },
      blood: {
        speaker: ELDER,
        enter: s => { s.flags.signetShown = true; },
        text: s => `"Hm. Old blood turns up in strange places. Keep that ring close. If anyone knows the way to Ironvale, it's a smith: they remember the old roads.${s.flags.brannocFreed ? " Ask that dwarf you brought back." : ""}"`,
      },
      fenReport: {
        speaker: ELDER,
        enter: (s, ctx) => { pay(s, ctx, SIGNET_REWARD); s.flags.fenReported = true; },
        text: (s, ctx) => `You've been up the goblins' passage? Greywater Fen... and the keep beyond. Then the old stories are true. Whatever woke in Ironvale, you carry its seal. Take this for the road. ${paid(ctx, SIGNET_REWARD)}`,
      },
      ironvale: {
        speaker: ELDER,
        text: s => (s.flags.varricDefeated
          ? `Warden. I knew it the day I saw that crest, ${callName(s.hero) || "my dear"}, and I didn't dare say. Oakhollow's proud of you. Now go and be careful: Wardens hold doors, and doors have two sides.`
          : s.flags.fenReported
          ? "The causeway, the hag, the keep... Be careful out there. And keep that ring close: I think it's been waiting for you."
          : s.flags.askedBrannoc
          ? "If the goblins fled from Ironvale, something worse lives there now. When the way opens, go carefully. And keep that ring close."
          : s.flags.brannocFreed ? "Ask Brannoc about the road to Ironvale. Smiths remember." : "The goblins kept a smith down in the King's hall, I've heard. Smiths remember the old roads."),
        choices: [{ label: "Do you know the Wardens' Oath?", if: s => actOf(s.flags) >= 3, to: "oath" }, { label: "Goodbye.", to: null }],
      },
      // Act 3: the old Warden's Oath, which Maren has in three pieces.
      oath: {
        speaker: ELDER,
        text: "The Oath? I have it in three pieces, from three different books, and they don't agree. Listen. The first: \"I am the wall. What comes against the door comes first against me.\" They called that the Oath of Iron.",
        to: "oath2",
      },
      oath2: { speaker: ELDER, text: "The second: \"I am the spark in the stone. The runes answer when I call.\" The Oath of Storm.", to: "oath3" },
      oath3: { speaker: ELDER, text: "And the third: \"I am the light at the threshold. What is dead shall not pass.\" The Oath of Dawn.", to: "oath4" },
      oath4: {
        speaker: ELDER,
        enter: s => { s.flags.oathFragments = true; },
        text: "Three Oaths, and no book says which a Warden swore. Perhaps each one chose for themselves. Perhaps, one day soon, you will.",
      },
      homeland: {
        speaker: ELDER,
        text: "Through the Door! The Wardens' homeland, the old songs called it: green as Willowmere, before the dragon. My grandmother's grandmother said the Wardens came over the mountain every spring with their banners flying. Bring the banners home, Warden.",
      },
      afterAll: {
        speaker: ELDER,
        text: s => `${callName(s.hero) ? `${callName(s.hero)}, ${titleOf(s.flags)}` : titleOf(s.flags)}! The goblins are gone, but the world is big. Keep exploring, and keep your blade sharp.`,
      },
    },
  },

  villager: {
    start: s => (actOf(s.flags) < 3 ? "hello" : s.flags.pipFound ? "home" : "juniors"),
    nodes: {
      // Act 3: the Junior Wardens, and after his big adventure, lines that follow the story.
      juniors: {
        speaker: "PIP",
        enter: s => { s.flags.pipJuniors = true; },
        text: "Look! A Wardenblade! Well, it's wood. I've started the Junior Wardens: me, the miller's twins and a goat. The goat's still a recruit. When I'm big I'm going to be a real Warden, like you!",
      },
      home: {
        speaker: "PIP",
        text: s => (s.flags.pipSentHome ? "A WOLF carried me home! A real one, bigger than the goat! It walked me all the way to the door, and then it licked Mum. She fainted. Twice."
          : !s.flags.pipRewarded ? "Mum's got something to say to you. And to me. Mostly to me."
          : s.flags.wardenTraining ? `Are you a REAL Warden now${comma(s)}? Does the sword glow? Can I hold it? Just for a second? Mum says no.`
            : "I'm grounded until I'm thirty. Worth it! The goat got promoted while I was away."),
      },
      hello: {
        speaker: "PIP",
        text: s => (s.flags.kingDefeated
          ? `You beat the Goblin KING${comma(s)}? I'm going to be a hero like you one day!`
          : s.flags.chiefDefeated
            ? "You beat the goblin chief? Wait till I tell the sheep! Old Tom says there's treasure out in Willowmere, south of here."
            : "Stick to the paths in the wood. The wolves come out of the trees, but less often on the paths."),
      },
    },
  },

  log: obstacle({
    look: "A huge fallen oak blocks the path.",
    checks: LOG_CHECKS, flag: "logCleared", passedFlag: "logPassed",
    shoveLabel: "Shove it aside", climbLabel: "Climb over",
    hurt: "You scrape your hands on the bark.",
    shoved: "With a mighty heave, the oak rolls into the ditch. The path is clear.",
    climbed: "You scramble over the trunk and drop down on the other side.",
  }),

  gate: obstacle({
    look: "A rusty iron gate blocks the tunnel. Snoring echoes from the hall beyond.",
    checks: GATE_CHECKS, flag: "gateOpened", passedFlag: "gatePassed",
    shoveLabel: "Lift the gate", climbLabel: "Squeeze through the bars",
    hurt: "The bars pinch and scrape you.",
    shoved: "You heave the gate up until it catches with a CLANK. The way is open.",
    climbed: "You wriggle between the bars and pop out on the other side.",
  }),

  cave: {
    start: s => (s.flags.chiefDefeated ? "quiet" : "enter"),
    nodes: {
      enter: {
        text: "Torchlight flickers inside. A huge goblin in a dented helmet rises from a heap of stolen pots and sacks. \"Who dares?\"",
        choices: [
          { label: "Fight!", to: "fight" },
          { label: "Back away", to: null },
        ],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...BOSS_FIGHT], zone: "cave", winFlag: "chiefDefeated" }) },
      quiet: {
        text: "The cave is quiet now. Behind the chief's empty throne, a dark tunnel leads down into the Deep Warrens.",
        choices: [
          { label: "Go down the tunnel", to: "deeper" },
          { label: "Not yet", to: null },
        ],
      },
      deeper: { enter: (s, ctx) => ctx.emit({ type: "travel", map: DEEP_CAVE.name, at: DEEP_CAVE.spawn }) },
    },
  },

  king: {
    start: "enter",
    nodes: {
      enter: {
        text: "On a throne of stolen treasure sits a goblin twice the size of the chief, with a crown of gold and a club like a tree trunk. \"YOU beat my chief? Then I'll squash you MYSELF!\"",
        choices: [
          { label: "Fight the Goblin King!", to: "fight" },
          { label: "Back away", to: null },
        ],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...KING_FIGHT], zone: "cave", winFlag: "kingDefeated", afterWin: "kingWords" }) },
    },
  },

  // Straight after you beat the Goblin King.
  kingWords: {
    start: "fall",
    nodes: {
      fall: {
        text: "The Goblin King crashes to his knees. \"The bones...\" he gasps. \"They walk. They took our home...\" Then he is still.",
        to: "after",
      },
      after: { text: "Something glints among the treasure on his throne. And from behind it comes a groan, and the clink of a chain." },
    },
  },

  // The ring on the Goblin King's throne: its seal is the crest on the hero's sword.
  signet: {
    start: "look",
    nodes: {
      look: {
        text: "Among the stolen pots and coins on the throne lies a heavy ring of black iron. Its seal is a tower between two keys: the same worn crest as on your sword's pommel.",
        choices: [{ label: "Take the ring", to: "take" }],
      },
      take: {
        enter: s => { s.flags.signetTaken = true; s.hero.inventory.push(makeItem("ironSignet")); },
        text: "It's warm in your hand, as if it knows you. You got the Iron Signet!",
      },
    },
  },

  // Brannoc, chained behind the throne: the goblins made him forge their armour.
  brannoc: {
    start: "hello",
    nodes: {
      hello: {
        speaker: BRANNOC,
        text: "You beat him? Ha! Then get me out of these chains, friend. The lock's rusty and the links are worse.",
        choices: [
          { label: `Smash the chain (STR, DC ${CHAIN_CHECKS.smash.dc})`, to: "smash" },
          { label: `Pick the lock (DEX, DC ${CHAIN_CHECKS.pick.dc})`, to: "pick" },
          { label: "Not now", to: null },
        ],
      },
      smash: { enter: (s, ctx) => ctx.goto(ctx.check(CHAIN_CHECKS.smash.ability, CHAIN_CHECKS.smash.dc).success ? "free" : "stuck") },
      pick: { enter: (s, ctx) => ctx.goto(ctx.check(CHAIN_CHECKS.pick.ability, CHAIN_CHECKS.pick.dc).success ? "free" : "stuck") },
      stuck: {
        speaker: BRANNOC,
        text: (s, ctx) => `${ctx.checkText} "Not quite. Again! I've got all day. Well. I've had all year."`,
        choices: [
          { label: `Smash the chain (STR, DC ${CHAIN_CHECKS.smash.dc})`, to: "smash" },
          { label: `Pick the lock (DEX, DC ${CHAIN_CHECKS.pick.dc})`, to: "pick" },
          { label: "Not now", to: null },
        ],
      },
      free: {
        enter: s => { s.flags.brannocFreed = true; },
        speaker: BRANNOC,
        text: (s, ctx) => `${ctx.checkText} The chain drops. "Brannoc, smith. They kept me down here a year, making their armour. That hobgoblin plate? Mine. Sorry about that."`,
        to: "sword",
      },
      sword: {
        speaker: BRANNOC,
        text: "He squints at your sword. \"That crest on the pommel... I've seen it before. Somewhere old. It'll come to me.\"",
        to: "go",
      },
      go: {
        speaker: BRANNOC,
        text: s => `"I'll make my own way up to Oakhollow. Find me by the smithy.${s.flags.signetTaken ? "" : " And take that ring off the throne: the King would have killed for it."}"`,
      },
    },
  },

  // The goblins' back passage behind the King's throne, up to Greywater Fen: blocked for now.
  rubble: {
    start: "look",
    nodes: {
      look: {
        text: s => (s.flags.askedBrannoc
          ? "The goblins' back passage, the one Brannoc told you about. Cold air sighs through the cracks between the rocks. It's choked solid: you'll need Brannoc for this."
          : "A passage climbs up into the dark, choked with fallen rock. A cold draught sighs through the cracks, smelling of marsh water."),
      },
    },
  },

  // The Goblin King's crown, where it fell. Mother Sallow would love it.
  crown: {
    start: "look",
    nodes: {
      look: {
        text: "The Goblin King's crown lies where it rolled: bent gold, too big for any goblin head but his, set with glass that's trying very hard to be rubies.",
        choices: [{ label: "Take the crown", to: "take" }, { label: "Leave it", to: null }],
      },
      take: {
        enter: s => { s.flags.crownTaken = true; s.hero.inventory.push(makeItem("goblinCrown")); },
        text: "You got the Goblin King's crown! Gaudy, but somebody might want it.",
      },
    },
  },

  // Greywater Fen and Ironvale (Act 2). The causeway under Sallow's water.
  flood: {
    start: "look",
    nodes: {
      look: {
        enter: s => { s.flags.causewaySeen = true; },
        text: s => (s.flags.metSallow
          ? "Mother Sallow's water, black and cold over the old stones. She won't let it go for nothing."
          : "The old causeway runs on north under black water, too deep and too cold to wade. Somewhere close by, someone is cackling."),
      },
    },
  },

  // Mother Sallow, the marsh hag: fight her for the causeway, or give her something shiny.
  sallow: {
    start: s => (s.flags.sallowBargain ? "pleased" : s.flags.metSallow ? "again" : "hello"),
    nodes: {
      hello: {
        speaker: SALLOW,
        enter: s => { s.flags.metSallow = true; },
        text: "Well, well! A visitor! Nobody visits Mother Sallow. Nobody nice, anyway. Mind the frogs, dearie: they're mine.",
        choices: [{ label: "Why is the causeway flooded?", to: "why" }, { label: "Goodbye.", to: null }],
      },
      why: {
        speaker: SALLOW,
        text: "Because Mother likes it wet! And because the dead up at the keep can't swim. Nor can you, I'll wager. Hee!",
        to: "deal",
      },
      again: { speaker: SALLOW, text: "Back again? Brought Mother something shiny, have we?", to: "deal" },
      deal: {
        speaker: SALLOW,
        text: "Raise the causeway? For free? Hee! Bring Mother something shiny. Something a king might wear.",
        choices: [
          { label: "Give her the Goblin King's crown", if: s => s.hero.inventory.some(i => i.base === "goblinCrown"), to: "bargain" },
          { label: "Then I'll make you raise it!", to: "fight" },
          { label: "Not now.", to: null },
        ],
      },
      bargain: {
        speaker: SALLOW,
        enter: (s, ctx) => {
          s.hero.inventory = s.hero.inventory.filter(i => i.base !== "goblinCrown");
          s.flags.sallowBargain = true;
          s.flags.causewayRaised = true;
          pay(s, ctx, CAUSEWAY_REWARD);
        },
        text: (s, ctx) => `"Ooooh. Shiny! Fits lovely." She waggles her fingers, and with a great gurgle the water drains off the causeway. "And dearie: Mother remembers who brings her presents." ${paid(ctx, CAUSEWAY_REWARD)}`,
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...SALLOW_FIGHT], zone: "fen", winFlag: "sallowDefeated", afterWin: "sallowFalls" }) },
      pleased: { speaker: SALLOW, text: "Mother's busy admiring her crown. Shoo, dearie, shoo! Come back when you've something else shiny." },
    },
  },

  // Straight after you beat Mother Sallow.
  sallowFalls: {
    start: "sink",
    nodes: {
      sink: {
        enter: (s, ctx) => { s.flags.causewayRaised = true; pay(s, ctx, CAUSEWAY_REWARD); },
        text: (s, ctx) => `Mother Sallow shrieks and sinks into the mud, and with a great gurgle her water drains off the old causeway. The way north to Ironvale Keep is open. ${paid(ctx, CAUSEWAY_REWARD)}`,
      },
    },
  },

  // Ironvale Keep (quest 5). The portcullis: heave it up, or find the winch in the gatehouse.
  keepGate: {
    start: "look",
    nodes: {
      look: {
        text: "The portcullis of Ironvale Keep is down and rusted solid. Through the bars: a courtyard, a chapel, and bones. A great many bones.",
        choices: [
          { label: `Heave it up (STR, DC ${KEEP_CHECKS.lift.dc})`, to: "lift" },
          { label: `Find the winch (DEX, DC ${KEEP_CHECKS.winch.dc})`, to: "winch" },
          { label: "Leave it", to: null },
        ],
      },
      lift: { enter: (s, ctx) => ctx.goto(ctx.check(KEEP_CHECKS.lift.ability, KEEP_CHECKS.lift.dc).success ? "lifted" : "stuck") },
      winch: { enter: (s, ctx) => ctx.goto(ctx.check(KEEP_CHECKS.winch.ability, KEEP_CHECKS.winch.dc).success ? "wound" : "stuck") },
      stuck: {
        text: (s, ctx) => `${ctx.checkText} A hundred years of rust says no. Not yet, anyway.`,
        choices: [
          { label: `Heave it up (STR, DC ${KEEP_CHECKS.lift.dc})`, to: "lift" },
          { label: `Find the winch (DEX, DC ${KEEP_CHECKS.winch.dc})`, to: "winch" },
          { label: "Leave it", to: null },
        ],
      },
      lifted: {
        enter: s => { s.flags.keepGateOpened = true; },
        text: (s, ctx) => `${ctx.checkText} You get your shoulder under the bars and heave. With a scream of rust the portcullis rises, and jams open. Ironvale Keep is open.`,
      },
      wound: {
        enter: s => { s.flags.keepGateOpened = true; },
        text: (s, ctx) => `${ctx.checkText} You squeeze through a gap in the gatehouse wall and find the winch. Round and round, and the portcullis grinds up. Ironvale Keep is open.`,
      },
    },
  },

  // The tomb door's three locks: the courtyard lever, the chapel seal and the armoury lever. The map object says
  // which flag it sets (`flag`) and what you see (`look`).
  lock: {
    start: (s, { object }) => (s.flags[object?.flag] ? "done" : "look"),
    nodes: {
      look: {
        text: (s, ctx) => ctx.object.look,
        choices: [
          { label: `Force it (STR, DC ${LOCK_CHECKS.force.dc})`, to: "force" },
          { label: `Work it loose (DEX, DC ${LOCK_CHECKS.loose.dc})`, to: "loose" },
          { label: "Leave it", to: null },
        ],
      },
      force: { enter: (s, ctx) => ctx.goto(ctx.check(LOCK_CHECKS.force.ability, LOCK_CHECKS.force.dc).success ? "opened" : "stuck") },
      loose: { enter: (s, ctx) => ctx.goto(ctx.check(LOCK_CHECKS.loose.ability, LOCK_CHECKS.loose.dc).success ? "opened" : "stuck") },
      stuck: {
        text: (s, ctx) => `${ctx.checkText} It doesn't give.`,
        choices: [
          { label: `Force it (STR, DC ${LOCK_CHECKS.force.dc})`, to: "force" },
          { label: `Work it loose (DEX, DC ${LOCK_CHECKS.loose.dc})`, to: "loose" },
          { label: "Leave it", to: null },
        ],
      },
      opened: {
        enter: (s, ctx) => {
          s.flags[ctx.object.flag] = true;
          if (locksOpen(s.flags) === 3) s.flags.tombOpen = true;
        },
        text: (s, ctx) => `${ctx.checkText} ${s.flags.tombOpen
          ? "With a clank, the chain runs off north. Far away, stone grinds on stone: the tomb door is open."
          : `With a clank, the chain runs off north. That's ${locksOpen(s.flags)} of the tomb's three locks.`}`,
      },
      done: { text: s => (s.flags.tombOpen ? "Open. The tomb door, to the north, stands open too." : `Open. ${locksOpen(s.flags)} of the tomb's three locks.`) },
    },
  },

  tombDoor: {
    start: "look",
    nodes: {
      look: {
        text: s => `A great door of black iron, with three chains running into it: west to the chapel, south to the courtyard, east to the armoury. ${locksOpen(s.flags)} of 3 are pulled.`,
      },
    },
  },

  sarcophagus: {
    start: s => (s.flags.signetReturned ? "rest" : s.flags.varricDefeated ? "hollow" : "empty"),
    nodes: {
      empty: { text: "Lord Varric's sarcophagus. The stone lid has been pushed aside, from the inside. It's empty." },
      hollow: { text: "On the lid, a ring-shaped hollow, waiting.", to: "place" },
      ...signetNodes(),
      rest: { text: "The Iron Signet sits in its hollow on the lid. The tomb is quiet, and so is the keep above it." },
    },
  },

  // Lord Varric, the Ironbound, risen and guarding his tomb. He thinks you're one more thief with his Signet.
  varric: {
    start: "rise",
    nodes: {
      rise: {
        speaker: VARRIC,
        text: "A knight in black plate rises from the dark, eyes like cold stars. \"Thief. You carry the seal you stole from my tomb. Give it back, or stand my watch forever.\"",
        choices: [
          { label: "I didn't steal it!", to: "deaf" },
          { label: "Draw your sword", to: "fight" },
          { label: "Back away", to: null },
        ],
      },
      deaf: { speaker: VARRIC, text: "\"They all say that.\" He lifts his sword.", to: "fight" },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...VARRIC_FIGHT], zone: "tomb", winFlag: "varricDefeated", afterWin: "varricFalls" }) },
    },
  },

  // Straight after you beat Lord Varric: the bloodline, said aloud at last, and the Signet goes home.
  varricFalls: {
    start: "fall",
    nodes: {
      fall: {
        speaker: VARRIC,
        text: "Varric staggers to one knee. His cold eyes find the crest on your sword, then your face. \"Warden's blood...\" he breathes. \"At last.\"",
        to: "still",
      },
      still: {
        text: "He bows his head, and is still. The Iron Signet grows warm in your pack. On the lid of his sarcophagus there's a ring-shaped hollow, waiting.",
        to: "place",
      },
      ...signetNodes(),
    },
  },

  // Brannoc's tools, left in the keep's armoury a long time ago. He'll be glad of them.
  brannocTools: {
    start: "look",
    nodes: {
      look: {
        enter: s => { s.flags.toolsFound = true; s.hero.inventory.push(makeItem("brannocTools")); },
        text: "Under an empty rack, a dwarf-sized toolbox bound in iron, with BRANNOC burned into the lid. How did these get here? You take them.",
      },
    },
  },

  rockslide: {
    start: "look",
    nodes: {
      look: { text: "Rocks the size of houses block the old road into the mountains. Not even Brannoc could shift these. Something shook them down, and not long ago." },
    },
  },

  // Fenwatch's shrine, where Robyn keeps the candles lit.
  shrine: {
    start: "look",
    nodes: { look: { text: s => (s.flags.oath === "dawn"
      ? "The little shrine is a temple now: Fenwatch built it out in new timber, gold sun over the door, and the candles never gutter. The fen's dead haven't stirred since you swore."
      : "A little stone shrine on the boardwalk, candles guttering in the damp. Someone keeps them lit, every night.") } },
  },

  // Robyn, a young cleric at the shrine. The Restless Dead: lay the fen's old graves to rest and she joins you.
  robyn: {
    start: s => (s.flags.gravesAtRest ? "thanks" : s.flags.robynQuest ? "waiting" : "hello"),
    nodes: {
      hello: {
        speaker: ROBYN,
        text: "You came up through the goblin hole? Then you can help. I'm Robyn; I keep the shrine. The fen's dead won't lie still: out west, past the end of the boardwalk, the old graves keep giving up ghouls.",
        choices: [{ label: "I'll lay them to rest.", to: "accept" }, { label: "Not now.", to: "busy" }],
      },
      accept: {
        speaker: ROBYN,
        enter: s => { s.flags.robynQuest = true; },
        text: "Bless you! Take this holy water. Beat whatever crawls out, then pour it over the cairn. The graves are among the dead trees, west, near where you came up.",
      },
      busy: { speaker: ROBYN, text: "Then pray for us, at least. The candles burn either way." },
      waiting: { speaker: ROBYN, text: "The old graves are west in the fen, among the dead trees near the goblins' passage. Beat the ghouls, then the holy water." },
      thanks: {
        speaker: ROBYN,
        text: "The graves are quiet! I felt it from here, like a held breath let go. But they weren't just restless: something's calling the dead. From the keep. I want to see it stopped. Can I come with you?",
        choices: [{ label: "Yes, join me.", to: "join" }, { label: "Maybe later.", to: "later" }],
      },
      join: {
        speaker: ROBYN,
        enter: (s, ctx) => {
          const left = joinParty(s.hero, "robyn");
          s.flags.robynJoined = true;
          ctx.remember("left", left && COMPANIONS[left].name);
        },
        text: "I'll keep you standing; you keep the dead lying down. Lead on!",
        to: "joined",
      },
      joined: { text: (s, ctx) => `Robyn joined your party!${ctx.recall("left") ? ` ${ctx.recall("left")} will wait for you at an inn: swap them there any time.` : ""}` },
      later: { speaker: ROBYN, text: "I'll be here, with the candles." },
    },
  },

  // The old graves in the fen: where the ghouls come from, until you lay them to rest for Robyn.
  cairn: {
    start: s => (s.flags.gravesAtRest ? "quiet" : s.flags.robynQuest ? "stir" : "look"),
    nodes: {
      look: { text: "A heap of old stones over a grave, sunk in the mud. All round it, the ground is clawed up from below." },
      stir: {
        text: "You uncork Robyn's holy water. At once the mud round the old graves heaves, and grey hands claw up out of it!",
        choices: [{ label: "Fight!", to: "fight" }, { label: "Back away", to: null }],
      },
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...GRAVES_FIGHT], zone: "fen", afterWin: "gravesRest" }) },
      quiet: { text: "The old cairn, quiet now. The mud is still, and someone has left a candle on the top stone." },
    },
  },

  // Straight after you beat the ghouls at the old graves.
  gravesRest: {
    start: "pour",
    nodes: {
      pour: {
        enter: s => { s.flags.gravesAtRest = true; },
        text: "You pour Robyn's holy water over the cairn. It hisses on the stones, the mud stops moving, and the fen goes very quiet. Robyn will want to know.",
      },
    },
  },

  // Brannoc at his forge in Fenwatch.
  brannocForge: {
    start: "hello",
    nodes: {
      hello: {
        speaker: BRANNOC,
        text: "\"My own forge again! Fenwatch let me in when I said I'd mend their nails. Walk into the door for business: I'll take your gear to +5.\"",
        to: "crest",
      },
      crest: {
        speaker: BRANNOC,
        text: "\"And that crest on your sword: I've placed it. The Wardens' mark, the lords of Ironvale. Folk round here would look at you funny if they saw it. Or bow.\"",
        choices: [
          { label: "Give Brannoc his tools", if: s => s.hero.inventory.some(i => i.base === "brannocTools"), to: "tools" },
          { label: "Varric called me Warden...", if: s => s.flags.signetReturned && !s.flags.bladeReforged, to: "warden" },
          { label: "Goodbye.", to: null },
        ],
      },
      // The end of Act 2: the sword becomes the Wardenblade, and the first rune.
      warden: {
        speaker: BRANNOC,
        text: "\"Did he now.\" Brannoc goes very quiet. \"Then that's Ironvale steel on your hip, and it's waited a hundred years for the right hand. Give it here. It deserves a proper forging.\"",
        to: "reforge",
      },
      reforge: {
        enter: (s, ctx) => {
          const blade = reforgeBlade(s.hero);
          learnRune(s.hero, "runeStrike");
          s.flags.bladeReforged = true;
          ctx.remember("blade", itemName(blade));
        },
        text: (s, ctx) => `All night the forge roars. At dawn Brannoc hands you the ${ctx.recall("blade")}: longer, brighter, silvered, the crest shining on the pommel. As your hand closes on it, a rune burns itself into the blade. You've learned Rune Strike! (SKILLS in a fight: after you hit, the rune flares for radiant damage. Two slots, back with a long rest.)`,
        to: "act2",
      },
      act2: {
        text: s => `ACT 2 COMPLETE. The dead of Ironvale sleep again, and they called you Warden. You are ${callName(s.hero) ? `${callName(s.hero)}, ` : ""}${titleOf(s.flags)}. The carvings in the tomb showed a door in the mountain pass, and something on the other side of it, pushing. Act 3 is coming. (Ironvale Keep is yours now: go home.)`,
      },
      tools: toolsNode(),
    },
  },

  // Brannoc in Oakhollow, once he's free. He knows the old road to Ironvale.
  brannocTown: {
    start: s => (s.flags.passageCleared ? "again" : s.flags.askedBrannoc ? "cleared" : s.flags.signetShown ? "road" : "hello"),
    nodes: {
      hello: {
        speaker: BRANNOC,
        text: s => `"Sun on my face! I'd forgotten.${s.flags.signetTaken ? " That ring you took: show it to your Elder. She looked at me like she knows old things." : ""} And that crest on your sword still bothers me."`,
      },
      road: {
        speaker: BRANNOC,
        text: "\"Ironvale? The Iron Road ran east from here, over the hills, but the gate's been shut a hundred years. The goblins came the back way: a passage behind the King's throne, climbing up to the fen.\"",
        to: "rubble",
      },
      rubble: {
        speaker: BRANNOC,
        enter: s => { s.flags.askedBrannoc = true; },
        text: "\"It's choked with rubble now. The goblins brought the roof down behind them, running from whatever's up there. Give me a day with a pick, and come back.\"",
      },
      cleared: {
        speaker: BRANNOC,
        enter: s => { s.flags.passageCleared = true; },
        text: "He's covered in rock dust, and grinning. \"Done! The passage behind the throne goes all the way up. Smells of marsh at the top: that'll be Greywater Fen. Mind the water, and mind what lives in it.\"",
      },
      again: {
        speaker: BRANNOC,
        text: "\"Ironvale steel on your hip and an Ironvale ring in your pack. Strange company you keep. I'll be setting up a forge in Fenwatch: look for me there.\"",
      },
    },
  },

  fisher: {
    start: s => (s.hero.inventory.some(i => i.base === "oldGnasher") ? "gnasher" : s.flags.gnasherQuest && !s.flags.gnasherCaught ? "biting" : s.flags.metTom ? "again" : "hello"),
    nodes: {
      // Act 3: Old Gnasher, the legendary pike.
      biting: {
        speaker: "OLD TOM",
        enter: s => { s.flags.metTom = true; },
        text: "You got my letter! Old Gnasher's biting at last: he took a duck off the lake this morning, the brute. Use my rod by the jetty, and when he bites, reel like your life depends on it.",
      },
      gnasher: {
        speaker: "OLD TOM",
        enter: (s, ctx) => {
          s.hero.inventory = s.hero.inventory.filter(i => i.base !== "oldGnasher");
          s.flags.gnasherCaught = true;
          pay(s, ctx, GNASHER_REWARD);
        },
        text: (s, ctx) => `OLD GNASHER! Sixty years I've fished for him! Here, here: take this, and I'll mount him over my fireplace where he can't bite anyone ever again. ${paid(ctx, GNASHER_REWARD)}`,
      },
      hello: {
        speaker: "OLD TOM",
        enter: s => { s.flags.metTom = true; },
        text: "Ahoy! Not many folk come down to Willowmere. There's an old chest on the little island, if you can find the bridge. Here, take a Potion of Speed: you'll be past the boars before they see you.",
        to: "gift",
      },
      gift: {
        enter: s => { s.hero.inventory.push(makeItem("potionSpeed")); },
        text: "You got a Potion of Speed!",
        to: "hut",
      },
      hut: { speaker: "OLD TOM", text: "And if you're worn out, my hut's just up the path. Sleep in the spare bed whenever you like." },
      again: {
        speaker: "OLD TOM",
        text: s => (s.flags.groveChestOpened && s.flags.gardenChestOpened && s.flags.isleChestOpened
          ? "You found all of Willowmere's treasure! Clever as a heron, you are."
          : "They say the bramble grove in the east hides something. Look for the gap in the bushes. And the old garden, south-west."),
      },
    },
  },

  megan: {
    start: s => (s.flags.bowFound ? "found" : s.flags.meganQuest ? "waiting" : "hello"),
    nodes: {
      hello: {
        speaker: "MEGAN",
        text: "Oh! A real adventurer! I'm Megan. I was chasing a wolf through the Whispering Wood and I dropped my bow. Now I can't find it anywhere!",
        choices: [
          { label: "I'll find your bow.", to: "accept" },
          { label: "Sorry, I'm busy.", to: "busy" },
        ],
      },
      accept: {
        speaker: "MEGAN",
        enter: s => { s.flags.meganQuest = true; },
        text: "Thank you! I lost it somewhere in the far east of the wood, past where the path ends. Look in the corners where the trees are thick.",
      },
      busy: { speaker: "MEGAN", text: "Oh. Well, if you change your mind, I'll be right here." },
      waiting: { speaker: "MEGAN", text: "Any luck? My bow is somewhere in the far east of the Whispering Wood, in a corner where the trees are thick." },
      found: {
        speaker: "MEGAN",
        text: "My bow! You found it! You know what... adventuring looks much more fun with a friend. Can I come with you?",
        choices: [
          { label: "Yes! Join my party.", to: "join" },
          { label: "Maybe later.", to: "later" },
        ],
      },
      join: {
        speaker: "MEGAN",
        enter: s => { joinParty(s.hero, "megan"); s.flags.meganJoined = true; },
        text: "Hooray! I'll shoot anything that tries to hurt you. Lead the way!",
        to: "joined",
      },
      joined: { text: "Megan joined your party!" },
      later: { speaker: "MEGAN", text: "Okay! Come back when you're ready. I'll keep practising." },
    },
  },

  lostBow: {
    start: "look",
    nodes: {
      look: {
        // Open world: you can find the bow before you meet Megan.
        enter: s => { s.flags.bowFound = true; },
        text: s => (s.flags.meganQuest
          ? "Hidden in the bushes: a small bow with MEGAN carved on it. You found it! Take it back to her in Willowmere."
          : "Hidden in the bushes: a small bow with MEGAN carved on it. Someone must be missing this. You take it with you."),
      },
    },
  },

  // Inside Elder Maren's house. What she's written so far follows the quests, with a hint for the next one.
  journal: {
    start: s => (s.flags.kingDefeated ? "hero" : s.flags.chiefDefeated ? "king" : "chief"),
    nodes: {
      chief: {
        text: "Elder Maren's journal. \"Goblins raid us every week now. Their chief is strong, and the fallen oak keeps the cave safe from all but the strongest or nimblest. Whoever goes should train in the wood first, and get a sharper blade.\"",
      },
      king: {
        text: "Elder Maren's journal. \"The chief served a KING, deep under the hills. Old stories say hobgoblins guard his tunnels, in armour that turns most blades. A Potion of Dexterity, for an extra blow with every swing, would be worth every coin.\"",
      },
      hero: {
        text: s => `Elder Maren's journal. "Today the Goblin King fell. I have written ${callName(s.hero) ? `${callName(s.hero)}, ${titleOf(s.flags)},` : "our hero's name"} in the village book, so Oakhollow never forgets." Your name is underlined. Twice.`,
      },
    },
  },

  // Pip's mum, at home. She gives you a Potion of Healing the first time, and knows a thing or two.
  hazel: {
    start: s => {
      const f = s.flags;
      if (f.pipRanAway && !f.pipFound) return "pipGone";
      if (f.pipFound && !f.pipRewarded) return "pipHome";
      if (actOf(f) >= 3 && !f.gnasherQuest) return "letter";
      return f.metHazel ? "again" : "hello";
    },
    nodes: {
      // Act 3: a letter from Old Tom, Pip's Big Adventure, and Pip's badge.
      letter: {
        speaker: "HAZEL",
        enter: s => { s.flags.gnasherQuest = true; s.flags.metHazel = true; },
        text: "There you are! Old Tom sent a letter up with the miller's boy; his knees won't do the hill. It says: \"OLD GNASHER IS BITING. Biggest pike in Willowmere, older than me. Bring a strong arm. Tom.\"",
      },
      pipGone: {
        speaker: "HAZEL",
        enter: s => { s.flags.hazelPipNews = true; },
        text: "Pip's gone! He left a note: \"GONE TO BE A WARDEN. DON'T WORRY. BACK FOR TEA.\" He took his wooden sword and his shield, and the miller saw him go off into the Whispering Wood. Please find him!",
      },
      pipHome: {
        speaker: "HAZEL",
        text: "You found him! In the goblin tunnels, with KOBOLDS! He's grounded until he's thirty. But... thank you. He's got something for you. He made it himself.",
        to: "badge",
      },
      badge: {
        speaker: "PIP",
        enter: (s, ctx) => {
          s.hero.inventory.push(makeItem("juniorBadge"));
          s.flags.pipRewarded = true;
          pay(s, ctx, PIP_REWARD);
        },
        text: (s, ctx) => `A Junior Warden badge! It's tin. I scratched the letters with a nail. It means you're one of us. Well, you're the big one. (+${PIP_REWARD.xp} XP${ctx.recall("newLevel") ? `, level ${ctx.recall("newLevel")}!` : ""}. Once per rest, a saving throw you only just fail is +1.)`,
      },
      hello: {
        speaker: "HAZEL",
        enter: s => { s.flags.metHazel = true; },
        text: "Oh! You must be the adventurer Pip won't stop talking about. I'm Hazel, his mum. Here, take this. Anyone fighting goblins needs it more than I do.",
        to: "gift",
      },
      gift: {
        enter: s => { s.hero.inventory.push(makeItem("potionHealing")); },
        text: "Hazel gives you a Potion of Healing!",
      },
      again: {
        speaker: "HAZEL",
        text: s => (actOf(s.flags) >= 3 ? "Pip's been building something in the square all week. I'm told it's you. Be kind about the head."
          : s.flags.kingDefeated
          ? "Pip has made himself a wooden crown and says he's the Goblin King now. You're welcome for tea any time."
          : s.flags.chiefDefeated
            ? "Down in Willowmere, Old Tom has a spare bed. Handy if you're hurt and a long way from Oakhollow."
            : `Pip's right about the wood: stick to the paths and the wolves bother you less. And when you're hurt, Nell at the Sleeping Fox lets a bed for ${INN_COST} gold.`),
      },
    },
  },

  // Old Tom's spare bed: a full rest in Willowmere, once he's said you can use it.
  bed: {
    start: s => (s.flags.metTom ? "offer" : "ask"),
    nodes: {
      ask: { text: "A neat little bed with a blue blanket. It must be Old Tom's. Better ask him before you climb in." },
      offer: {
        text: "Old Tom's spare bed. He said you're welcome to it.",
        choices: [
          { label: "Sleep (full rest)", to: "sleep" },
          { label: "Not now", to: null },
        ],
      },
      sleep: {
        enter: s => rest(s.hero),
        text: s => (s.hero.companion ? "You both sleep like logs. Everyone's HP and your Second Wind restored." : "You sleep like a log. HP and Second Wind restored."),
        choices: afterRest,
      },
      ...talkNodes(),
    },
  },

  // Nell, who keeps the Sleeping Fox, Oakhollow's inn: a long rest for INN_COST gold. If you fainted, you were
  // carried in and woke here for free.
  inn: innScript({
    keeper: "NELL", hub: "oakhollow",
    welcome: cost => `Welcome to the Sleeping Fox! A soft bed and a hot supper, ${cost} gold a night. You'll wake up good as new.`,
    famous: (s, cost) => `${callName(s.hero) || "The hero"}, ${titleOf(s.flags)}, in my inn! Your bed's ready: ${cost} gold, same as anyone. Fair's fair.`,
    poor: (s, cost) => `It's ${cost} gold, love, and you've only ${s.hero.gold}. The bank's just down the road, or Old Tom in Willowmere has a spare bed for nothing.`,
    bye: "Mind how you go. The door's always open.",
  }),

  // The bounty board in the Drowned Duck: one hunt at a time, paid here, and taken again as often as you like.
  bounties: {
    start: s => (currentBounty(s)?.finished ? "claim" : s.bounty ? "hunting" : "board"),
    nodes: {
      board: {
        text: s => `Hunts, pinned up with fish hooks${actOf(s.flags) >= 4 ? " (new ones, from beyond the Door)" : actOf(s.flags) >= 3 ? " (new ones, from the pass)" : ""}. Gully pays: ${boardFor(actOf(s.flags)).map(b => `${b.label} ${b.gold}g`).join(", ")}, and XP. One at a time.`,
        choices: [
          ...BOUNTIES.map(b => ({ label: `${b.label} x${b.count}`, if: s => boardFor(actOf(s.flags)).includes(b), to: `take_${b.id}` })),
          { label: "Leave it", to: null },
        ],
      },
      ...Object.fromEntries(BOUNTIES.map(b => [`take_${b.id}`, {
        enter: s => { takeBounty(s, b.id); },
        text: `You tear down the notice: ${b.title}. Beat ${b.count} of them, then come back to the board for ${b.gold} gold and ${b.xp} XP.`,
      }])),
      hunting: {
        text: s => `Your hunt: ${bountyLine(s).replace("Bounty: ", "")}.`,
        choices: [{ label: "Keep hunting", to: null }, { label: "Give up the hunt", to: "drop" }],
      },
      drop: { enter: s => dropBounty(s), text: "You pin the notice back on the board. Someone else's problem now." },
      claim: {
        enter: (s, ctx) => {
          const r = claimBounty(s, ctx.rng);
          ctx.remember("claimed", r);
        },
        text: (s, ctx) => {
          const r = ctx.recall("claimed"), up = r.levelUps.at(-1);
          return `Gully counts out the coin. "${r.bounty.title}: done, and done well." (+${r.bounty.gold} gold, +${r.bounty.xp} XP${up ? `, level ${up.level}!` : ""})`;
        },
      },
    },
  },

  // Gully, who keeps the Drowned Duck, Fenwatch's tavern: dearer than Nell (it's Act 2).
  duck: innScript({
    keeper: "GULLY", hub: "fenwatch",
    welcome: cost => `Welcome to the Drowned Duck! Dry beds, ${cost} gold a night, frog stew free. The bounty board's by the hearth if you're after work.`,
    famous: (s, cost) => `${callName(s.hero) || "Traveller"}! Folk say you came up out of the goblin hole. A bed's ${cost} gold. Don't drip on the floor.`,
    poor: (s, cost) => `${cost} gold, friend, and you've ${s.hero.gold}. Try the bounty board: there's always something in the fen that wants killing.`,
    bye: "Mind the planks on your way out. Some of them aren't planks.",
  }),

  // Hild, the keep's steward, come up from Fenwatch once the dead sleep: your own bed (free), and the companions who
  // aren't with you wait in the hall. Talking to her makes the keep your home.
  keepHall: innScript({
    keeper: "HILD", hub: "keep", stayLabel: "Sleep in your own bed",
    onHello: (s, ctx) => {
      const first = !s.flags.keepHome;
      ctx.remember("first", first);
      s.flags.keepHome = true;
      if (!first && !s.flags.heardTremor && !s.flags.metRachel) ctx.goto("tremor"); // Act 3 begins: the keep shook
    },
    extra: { tremor: tremorNode },
    welcome: () => "Welcome home.",
    famous: (s, cost, ctx) => `${!ctx.recall("first") ? "Welcome home" : "So you're the one who put the old lord to bed. I kept the Duck's kitchen for thirty years; Gully says this place needs a steward more than he does. Welcome home"}, ${callName(s.hero) || "my lord"}. Your bed's made, and your friends can wait in the hall.`,
    poor: () => "It's your own bed. It's free.",
    bye: "I'll keep the fire in.",
  }),

  // Brannoc's forge in the keep, where he moves once the blade is reforged: the same shop as Fenwatch's.
  keepForge: {
    start: "hello",
    nodes: {
      hello: {
        speaker: BRANNOC,
        text: s => (s.flags.oath === "iron" ? "\"Sworn of Iron! Now THAT'S a Warden. Come and see what I've made you: Warden plate. First in a hundred years.\""
          : "\"Ironvale's forge, lit again after a hundred years! The bellows still work. Same as ever: gear to +5, and silver.\""),
        choices: [
          { label: "Let's see the forge", to: "shop" },
          { label: "Give Brannoc his tools", if: s => s.hero.inventory.some(i => i.base === "brannocTools"), to: "tools" },
          { label: "Show Brannoc the rune-iron", if: s => s.hero.inventory.some(i => i.base === "runeIron"), to: "runeIron" },
          { label: "Goodbye.", to: null },
        ],
      },
      shop: { enter: (s, ctx) => ctx.emit({ type: "shop", shop: s.flags.oath === "iron" ? "forgeIron" : "forge" }) },
      tools: toolsNode(),
      // The Wardenblade's second form: one more rune slot.
      runeIron: {
        speaker: BRANNOC,
        text: "\"Rune-iron. From the Wardens' own forge. I haven't seen this since... I've never seen this. My granddad had a nail of it. Give me the blade. And a day.\"",
        to: "secondForm",
      },
      secondForm: {
        enter: s => {
          s.hero.inventory = s.hero.inventory.filter(i => i.base !== "runeIron");
          s.hero.bladeForm = 2;
          s.flags.bladeSecondForm = true;
        },
        text: s => `Brannoc works the rune-iron into the Wardenblade's fuller, and when he hands it back a second rune-channel runs down the steel, faintly blue. The Wardenblade's second form: one more rune slot. "The last form's beyond that Door, ${callName(s.hero) || "lad"}. Somewhere. I can feel it."`,
      },
    },
  },

  // The campfire at Goblin Rocks, kept going by Oakhollow's woodcutters: a free short rest. No monsters come near it.
  campfire: {
    start: "look",
    nodes: {
      look: {
        text: "A ring of stones around a crackling fire. Woodcutters from Oakhollow keep it going. No monster comes near it.",
        choices: [
          { label: "Rest by the fire (short rest)", to: "rest" },
          { label: "Send Quill to scout", if: withRachel, to: "scout" },
          { label: "Not now", to: null },
        ],
      },
      scout: scoutNode,
      rest: {
        enter: (s, ctx) => {
          if (s.map === "pass" && nettleHaunting(s)) return ctx.goto("nettle"); // Auntie Nettle won't let you sleep
          const r = { ...shortRest(s.hero, companionStats(s.hero)?.maxHp), recovered: arcaneRecovery(s.hero) };
          ctx.remember("rest", r);
          if (!r.healed && !r.secondWind && !r.actionSurge && !r.companionHealed && !r.recovered && !r.runes) ctx.goto("rested");
        },
        text: (s, ctx) => {
          const r = ctx.recall("rest");
          const got = [r.healed && `+${r.healed} HP`, r.companionHealed && `${companionStats(s.hero).name} +${r.companionHealed} HP`, r.secondWind && "Second Wind back", r.actionSurge && "Action Surge back",
            r.recovered && `Rachel's Arcane Recovery: ${r.recovered} spell slot${r.recovered > 1 ? "s" : ""} back`,
            r.runes && `the Storm gives back ${r.runes} rune slot${r.runes > 1 ? "s" : ""}`].filter(Boolean);
          return `You warm your hands and catch your breath. ${got.join(", ")}. (A short rest brings you up to half your HP. For a full rest, find a bed.)`;
        },
        choices: afterRest,
      },
      rested: { text: "You're as rested as a fire can make you. A short rest brings you up to half your HP; for more, you need a bed.", choices: afterRest },
      nettle: {
        enter: s => { s.flags.nettleMet = true; },
        speaker: "AUNTIE NETTLE",
        text: "A cackle out of the dark. \"Sleep? On MY mountain? After what you did to my sister? Not tonight, dearie!\" Something cold pours over the fire, and it gutters out. No rest here, until you deal with her. (Her hut's on the slopes, east.)",
      },
      ...talkNodes(),
    },
  },

  chest: {
    start: "open",
    nodes: {
      open: {
        // The map object says what's inside. Opening it sets the flag that removes it from the map.
        enter: (s, ctx) => {
          const o = ctx.object, loot = o?.loot || { gold: 0, items: [] };
          s.hero.gold += loot.gold;
          const items = loot.items.map(base => makeItem(base));
          s.hero.inventory.push(...items);
          if (o) s.flags[o.goneWhen] = true;
          const found = [loot.gold ? `${loot.gold} gold` : "", ...items.map(itemName)].filter(Boolean);
          ctx.remember("found", found);
          ctx.emit({ type: "loot", found }); // the meeting screen shows each thing coming out of the chest
        },
        text: (s, ctx) => `You open the chest and find: ${ctx.recall("found").join(", ")}!`,
      },
    },
  },
};

/* Giving Brannoc his tools back (at either of his forges): he silvers your weapon for free. */
function toolsNode() {
  return {
    speaker: BRANNOC,
    enter: s => {
      s.hero.inventory = s.hero.inventory.filter(i => i.base !== "brannocTools");
      s.flags.toolsReturned = true;
      const w = s.hero.equipment.weapon;
      if (w) w.silvered = true;
    },
    text: s => (s.hero.equipment.weapon
      ? `"My tools! My own hammer! Where were... the keep's armoury? I've never been... Hm. Never mind. Here: on the house." He silvers your ${itemName(s.hero.equipment.weapon)} while you wait.`
      : "\"My tools! My own hammer! I owe you. Come back with a sword in your hand and I'll silver it, on the house.\""),
  };
}

/* Putting the Iron Signet back on Varric's tomb: the dead sleep again, the carvings show the door in the pass, and
   quest 5's reward. Shared by the end of the fight and the sarcophagus (if you walked away first). */
function signetNodes() {
  return {
    place: {
      text: "The Iron Signet is warm in your hand, as if it knows where it belongs.",
      choices: [{ label: "Put the Signet back", to: "placed" }],
    },
    placed: {
      enter: (s, ctx) => {
        s.hero.inventory = s.hero.inventory.filter(i => i.base !== "ironSignet");
        s.flags.signetReturned = true;
        pay(s, ctx, KEEP_REWARD);
      },
      text: (s, ctx) => `It fits the hollow like a key. All through the keep, things that were walking lie down. Carved round the tomb walls: a knight with the Signet before a great door in the mountains, and beyond the door, something vast, pushing. ${paid(ctx, KEEP_REWARD)} (Brannoc should hear about this.)`,
    },
  };
}

/* An inn: its keeper lets a bed for the night (a long rest, for the hub's innCost), and keeps the companions who aren't
   travelling with you (the roster: one choice per companion to leave them or bring them along). */
function innScript({ keeper, hub, welcome, famous, poor, bye, stayLabel, onHello, extra = {} }) {
  const cost = () => hubById(hub).innCost;
  return {
    start: "hello",
    nodes: {
      hello: {
        speaker: keeper,
        enter: onHello,
        text: (s, ctx) => (s.flags.kingDefeated ? famous(s, cost(), ctx) : welcome(cost())),
        choices: [
          { label: stayLabel || `Stay the night (${cost()} gold)`, to: "stay" },
          { label: "Your companions", if: s => !!(s.hero.companion || s.hero.roster?.length), to: "party" },
          { label: "Not now", to: "bye" },
        ],
      },
      party: {
        speaker: keeper,
        text: s => (s.hero.roster?.length
          ? `Waiting by the fire: ${s.hero.roster.map(r => COMPANIONS[r.id].name).join(", ")}.${s.hero.companion ? ` With you: ${COMPANIONS[s.hero.companion.id].name}.` : ""}`
          : `${COMPANIONS[s.hero.companion.id].name} could wait here by the fire, if you'd rather travel alone.`),
        choices: [
          ...Object.entries(COMPANIONS).flatMap(([id, c]) => [
            { label: `${c.name}: wait here`, if: s => s.hero.companion?.id === id, to: "bench" },
            { label: `${c.name}: come along`, if: s => !!s.hero.roster?.some(r => r.id === id), to: `take_${id}` },
          ]),
          { label: "Back", to: "hello" },
        ],
      },
      bench: {
        enter: (s, ctx) => ctx.remember("benched", COMPANIONS[benchCompanion(s.hero).id].name),
        text: (s, ctx) => `${ctx.recall("benched")} takes a seat by the fire. "I'll be right here when you need me!" (Bring them back any time, from any inn.)`,
      },
      ...Object.fromEntries(Object.entries(COMPANIONS).map(([id, c]) => [`take_${id}`, {
        enter: (s, ctx) => {
          const before = s.hero.companion?.id;
          takeCompanion(s.hero, id);
          ctx.remember("swapped", before && COMPANIONS[before].name);
        },
        text: (s, ctx) => `${c.name} jumps up, rested and ready.${ctx.recall("swapped") ? ` ${ctx.recall("swapped")} will wait here instead.` : ""}`,
      }])),
      stay: {
        enter: (s, ctx) => {
          if (s.hero.gold < cost()) return ctx.goto("poor");
          s.hero.gold -= cost();
          rest(s.hero);
          ctx.goto("slept");
        },
      },
      slept: {
        text: s => `${s.hero.companion ? "You both sleep like logs. Everyone's HP" : "You sleep like a log. HP"} and Second Wind restored.${cost() ? ` (-${cost()} gold)` : ""}`,
        choices: afterRest,
      },
      ...talkNodes(),
      poor: { speaker: keeper, text: s => poor(s, cost()) },
      bye: { speaker: keeper, text: bye },
      ...extra,
    },
  };
}

/* A blocked way with two ways past, like the fallen oak: a STR check clears it for good (sets `flag`), a DEX check
   puts you on the far side (and sets `passedFlag`, for the quest log). A failed try costs 1d4 HP but never knocks
   you out. */
function obstacle({ look, checks, flag, passedFlag, shoveLabel, climbLabel, hurt, shoved, climbed }) {
  return {
    start: "look",
    nodes: {
      look: {
        text: look,
        choices: [
          { label: `${shoveLabel} (STR, DC ${checks.shove.dc})`, to: "shove" },
          { label: `${climbLabel} (DEX, DC ${checks.climb.dc})`, to: "climb" },
          { label: "Leave it", to: null },
        ],
      },
      shove: {
        enter: (s, ctx) => {
          const r = ctx.check(checks.shove.ability, checks.shove.dc);
          if (r.success) { s.flags[flag] = true; ctx.goto("shoved"); } else ctx.goto("hurt");
        },
      },
      climb: {
        enter: (s, ctx) => {
          const r = ctx.check(checks.climb.ability, checks.climb.dc);
          if (!r.success) return ctx.goto("hurt");
          // Land on the far side: as far past the obstacle as you stand in front of it.
          const o = ctx.object;
          if (o) { const t = tileOf(s.pos); s.pos = feetAt(2 * o.x - t.x, 2 * o.y - t.y); }
          s.flags[passedFlag] = true;
          ctx.goto("climbed");
        },
      },
      hurt: {
        // A scrape, never a knockout: you keep at least 1 HP.
        enter: (s, ctx) => {
          const dmg = Math.min(ctx.roll("1d4"), s.hero.hp - 1);
          s.hero.hp -= dmg;
          ctx.remember("hurt", dmg);
        },
        text: (s, ctx) => `${ctx.checkText} ${hurt} -${ctx.recall("hurt")} HP.`,
        choices: [
          { label: "Try again", to: "look" },
          { label: "Leave it", to: null },
        ],
      },
      shoved: { text: (s, ctx) => `${ctx.checkText} ${shoved}` },
      climbed: { text: (s, ctx) => `${ctx.checkText} ${climbed}` },
    },
  };
}

/* Side quests (and a bounty hunt), shown on a second HUD line: the first one still going. */
export function sideObjective(flags, state = {}) {
  if (flags.meganQuest && !flags.meganJoined) return flags.bowFound ? "Bring the bow back to Megan" : "Find Megan's bow in the Whispering Wood";
  if (flags.robynQuest && !flags.robynJoined) return flags.gravesAtRest ? "Tell Robyn the graves are quiet" : "Lay the restless graves in the fen to rest";
  if (flags.refugeeQuest && !flags.refugeesHelped) return "Chase off the lizardfolk raiding the goblins' camp";
  if (flags.nettleMet && !flags.nettleDefeated) return "Find Auntie Nettle's hut on the pass's slopes";
  if (flags.queenMet && !flags.queenSettled) return "Deal with the Queen of the Fen on the causeway";
  if (flags.runeIronFound && !flags.bladeSecondForm) return "Take the rune-iron to Brannoc at the keep";
  if (flags.matthewQuest && !flags.matthewFound) return "Follow Corwin's arrows up the pass, with Megan";
  if (flags.chapelQuest && !flags.chapelLit) return "Take Robyn to the Frozen Chapel on the pass";
  if (flags.pipRanAway && !flags.pipRewarded) return flags.pipFound ? "See Pip and Hazel in Oakhollow" : flags.hazelPipNews ? "Find Pip: his trail goes into the wood" : "Ask Hazel what's happened to Pip";
  return bountyLine(state);
}

/* How many of Elder Maren's quests are done and paid for (the HUD cheers when this goes up). The Iron Signet isn't
   counted until it can be finished. */
export const questsDone = flags => [flags.questRewarded, flags.kingRewarded, flags.fenReported, flags.causewayRaised, flags.signetReturned,
  flags.rockslideOpen, flags.wardensRoad, flags.gatehouseDone, flags.oathSworn, flags.q9Done, flags.q10Done, flags.q11Done].filter(Boolean).length;

/* The line under the HP box saying what to do next. */
export function objective(flags) {
  if (flags.kingRewarded) {
    if (!flags.signetTaken) return "Search the Goblin King's hall";
    if (!flags.brannocFreed) return "Free the smith chained in the King's hall";
    if (!flags.signetShown) return "Show the Iron Signet to Elder Maren";
    if (!flags.askedBrannoc) return "Ask Brannoc about Ironvale";
    if (!flags.passageCleared) return "Come back to Brannoc by the smithy";
    if (!flags.seenFen) return "Climb the goblins' passage behind the King's throne";
    if (!flags.fenReported) return "Tell Elder Maren about Greywater Fen";
    if (!flags.metSallow) return "Find a way across the drowned causeway";
    if (!flags.causewayRaised) return "Deal with Mother Sallow: fight her, or bargain";
    if (!flags.keepGateOpened) return "Open the portcullis of Ironvale Keep";
    if (!flags.tombOpen) return `Open the tomb's three locks in the keep (${locksOpen(flags)}/3)`;
    if (!flags.seenTomb && !flags.varricDefeated) return "Go down into Lord Varric's tomb";
    if (!flags.varricDefeated) return "Face Lord Varric in his tomb";
    if (!flags.signetReturned) return "Put the Iron Signet back on Varric's tomb";
    if (!flags.bladeReforged) return "Tell Brannoc what Varric called you";
    if (!flags.keepHome) return "Go home to Ironvale Keep: Hild is waiting";
    if (!flags.heardTremor && !flags.metRachel) return "Hild has news: talk to her again";
    if (!flags.metRachel) return "Go to the rockslide, north of the keep";
    if (!flags.rockslideOpen) return stonesFound(flags) < 3 ? `Find the rune-stones near the keep (${stonesFound(flags)}/3)` : "Take the rune-stones to Rachel";
    if (!flags.metColleen) return "Climb the pass to the first waystone";
    if (!flags.waystoneIron) return "Pass the trial of Iron at the first waystone";
    if (!flags.waystoneCall) return "Cross the ice to the second waystone";
    if (!flags.bindingStolen && !flags.bindingRecovered) return "Climb to the third waystone, over the chasm";
    if (!flags.bindingRecovered) return "Take the Binding back from Thorne's camp, east";
    if (!flags.wardensRoad) return "Take the Binding back to Colleen";
    if (!flags.gatehouseOpen) return "Open the Wardens' gatehouse, at the top";
    if (!flags.runeDoor3) return "Get through the gatehouse's rune doors";
    if (!flags.thorneDefeated) return "Stop Thorne at the Door";
    if (!flags.gatehouseDone) return "Decide what to do with Thorne";
    if (!flags.oathSworn) return "Face the Door";
    if (!flags.q9Started && !flags.doorOpened) return "Go home to Ironvale Keep: Hild has news";
    if (!flags.doorOpened) return "Open the Door, at the top of the gatehouse";
    if (!flags.seenThreshold) return "Go through the Door";
    if (!flags.warbandFled) return "Follow the footprints up the ash road";
    if (!flags.q9Done) return "Follow the grey wolf to the wildwood, west";
    if (!flags.wolfFollowed) return "Follow the grey wolf up the trail, north";
    if (!flags.claireMet) return "Find who sent the wolves, up in the wildwood";
    if (!flags.q10Done) return "Fight the dragon's brood beside the twins";
    if (!flags.seenLastwatch) return "Find Claire's father at Lastwatch, east along the ash road";
    if (!flags.cindersBeaten) return "Fight through the Cinder Wardens at Lastwatch's gate";
    if (!flags.q11Done) return "Talk to Matt at Lastwatch";
    if (flags.meganJoined && !flags.meganPledged) return "Take Megan to the kobolds' diggings, over the bridge from Lastwatch";
    if (flags.robynJoined && !flags.robynPledged) return "Take Robyn to the shrine of the Dawn, south-east of Lastwatch";
    if (flags.claireJoined && !flags.clairePledged) return "Claire's waiting at Lastwatch";
    return "The Emberdeep (the next part of Act 4 is coming)";
  }
  if (flags.kingDefeated) return "Return to Elder Maren";
  if (flags.kingQuestStarted) return "Defeat the Goblin King deep in the cave";
  if (flags.questRewarded) return "Talk to Elder Maren";
  if (flags.chiefDefeated) return "Return to Elder Maren";
  if (flags.questStarted) return "Defeat the goblin chief in the cave";
  return "Talk to Elder Maren in Oakhollow";
}
