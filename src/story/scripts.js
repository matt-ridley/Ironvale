// The conversations in the game so far: Elder Maren's two quests (the goblin chief, then the Goblin King), Pip,
// Old Tom the fisher, the fallen oak, the goblin cave, chests, the iron gate and the Goblin King.
import { gainXp } from "../rules/character.js";
import { makeItem, itemName } from "../rules/items.js";
import { joinParty } from "../rules/party.js";
import { tileOf, feetAt } from "../world/movement.js";
import { DEEP_CAVE } from "../world/cave.js";

export const QUEST_REWARD = { gold: 100, xp: 300 };
export const KING_REWARD = { gold: 250, xp: 1000 };
export const LOG_CHECKS = { shove: { ability: "STR", dc: 12 }, climb: { ability: "DEX", dc: 14 } };
export const GATE_CHECKS = { shove: { ability: "STR", dc: 13 }, climb: { ability: "DEX", dc: 15 } };
export const BOSS_FIGHT = ["goblinChief", "goblin"];
export const KING_FIGHT = ["goblinKing"];

const ELDER = "ELDER MAREN";

export const SCRIPTS = {
  elder: {
    start: s => {
      const f = s.flags;
      if (f.kingRewarded) return "afterAll";
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
        text: (s, ctx) => (s.flags.questStarted ? "You did it! The chief is gone!" : "The goblin chief, gone? And I hadn't even asked you yet!")
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
        text: "Visit the apothecary by the crossroads first. A Potion of Dexterity lets you strike twice, and you'll want it against the King.",
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
        text: (s, ctx) => "The Goblin King, beaten! Oakhollow will sing about you for a hundred years."
          + ` Take this: ${KING_REWARD.gold} gold. (+${KING_REWARD.xp} XP${ctx.recall("newLevel") ? `, level ${ctx.recall("newLevel")}!` : ""})`,
      },
      afterAll: { speaker: ELDER, text: "Hero of Oakhollow! The goblins are gone, but the world is big. Keep exploring, and keep your blade sharp." },
    },
  },

  villager: {
    start: "hello",
    nodes: {
      hello: {
        speaker: "PIP",
        text: s => (s.flags.kingDefeated
          ? "You beat the Goblin KING? I'm going to be a hero like you one day!"
          : s.flags.chiefDefeated
            ? "You beat the goblin chief? Wait till I tell the sheep! Old Tom says there's treasure out in Willowmere, south of here."
            : "Stick to the paths in the wood. The wolves come out of the trees, but less often on the paths."),
      },
    },
  },

  log: obstacle({
    look: "A huge fallen oak blocks the path.",
    checks: LOG_CHECKS, flag: "logCleared",
    shoveLabel: "Shove it aside", climbLabel: "Climb over",
    hurt: "You scrape your hands on the bark.",
    shoved: "With a mighty heave, the oak rolls into the ditch. The path is clear.",
    climbed: "You scramble over the trunk and drop down on the other side.",
  }),

  gate: obstacle({
    look: "A rusty iron gate blocks the tunnel. Snoring echoes from the hall beyond.",
    checks: GATE_CHECKS, flag: "gateOpened",
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
      fight: { enter: (s, ctx) => ctx.emit({ type: "battle", foes: [...KING_FIGHT], zone: "cave", winFlag: "kingDefeated" }) },
    },
  },

  fisher: {
    start: s => (s.flags.metTom ? "again" : "hello"),
    nodes: {
      hello: {
        speaker: "OLD TOM",
        enter: s => { s.flags.metTom = true; },
        text: "Ahoy! Not many folk come down to Willowmere. There's an old chest on the little island, if you can find the bridge. Here, take a Potion of Speed: you'll be past the boars before they see you.",
        to: "gift",
      },
      gift: {
        enter: s => { s.hero.inventory.push(makeItem("potionSpeed")); },
        text: "You got a Potion of Speed!",
      },
      again: {
        speaker: "OLD TOM",
        text: s => (s.flags.groveChestOpened && s.flags.gardenChestOpened && s.flags.isleChestOpened
          ? "You found all of Willowmere's treasure! Clever as a heron, you are."
          : "They say the bramble grove in the east hides something. Look for the gap in the bushes. And the old garden, south-west."),
      },
    },
  },

  wren: {
    start: s => (s.flags.bowFound ? "found" : s.flags.wrenQuest ? "waiting" : "hello"),
    nodes: {
      hello: {
        speaker: "WREN",
        text: "Oh! A real adventurer! I'm Wren. I was chasing a wolf through the Whispering Wood and I dropped my bow. Now I can't find it anywhere!",
        choices: [
          { label: "I'll find your bow.", to: "accept" },
          { label: "Sorry, I'm busy.", to: "busy" },
        ],
      },
      accept: {
        speaker: "WREN",
        enter: s => { s.flags.wrenQuest = true; },
        text: "Thank you! I lost it somewhere in the far east of the wood, past where the path ends. Look in the corners where the trees are thick.",
      },
      busy: { speaker: "WREN", text: "Oh. Well, if you change your mind, I'll be right here." },
      waiting: { speaker: "WREN", text: "Any luck? My bow is somewhere in the far east of the Whispering Wood, in a corner where the trees are thick." },
      found: {
        speaker: "WREN",
        text: "My bow! You found it! You know what... adventuring looks much more fun with a friend. Can I come with you?",
        choices: [
          { label: "Yes! Join my party.", to: "join" },
          { label: "Maybe later.", to: "later" },
        ],
      },
      join: {
        speaker: "WREN",
        enter: s => { joinParty(s.hero, "wren"); s.flags.wrenJoined = true; },
        text: "Hooray! I'll shoot anything that tries to hurt you. Lead the way!",
        to: "joined",
      },
      joined: { text: "Wren joined your party!" },
      later: { speaker: "WREN", text: "Okay! Come back when you're ready. I'll keep practising." },
    },
  },

  lostBow: {
    start: "look",
    nodes: {
      look: {
        // Open world: you can find the bow before you meet Wren.
        enter: s => { s.flags.bowFound = true; },
        text: s => (s.flags.wrenQuest
          ? "Hidden in the bushes: a small bow with WREN carved on it. You found it! Take it back to her in Willowmere."
          : "Hidden in the bushes: a small bow with WREN carved on it. Someone must be missing this. You take it with you."),
      },
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
          ctx.remember("found", [loot.gold ? `${loot.gold} gold` : "", ...items.map(itemName)].filter(Boolean));
        },
        text: (s, ctx) => `You open the chest and find: ${ctx.recall("found").join(", ")}!`,
      },
    },
  },
};

/* A blocked way with two ways past, like the fallen oak: a STR check clears it for good (sets `flag`), a DEX check
   puts you on the far side. A failed try costs 1d4 HP but never knocks you out. */
function obstacle({ look, checks, flag, shoveLabel, climbLabel, hurt, shoved, climbed }) {
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

/* Side quests, shown on a second HUD line. */
export function sideObjective(flags) {
  if (flags.wrenJoined) return "";
  if (flags.bowFound) return "Bring the bow back to Wren";
  if (flags.wrenQuest) return "Find Wren's bow in the Whispering Wood";
  return "";
}

/* How many of Elder Maren's quests are done and paid for (the HUD cheers when this goes up). */
export const questsDone = flags => [flags.questRewarded, flags.kingRewarded].filter(Boolean).length;

/* The line under the HP box saying what to do next. */
export function objective(flags) {
  if (flags.kingRewarded) return "";
  if (flags.kingDefeated) return "Return to Elder Maren";
  if (flags.kingQuestStarted) return "Defeat the Goblin King deep in the cave";
  if (flags.questRewarded) return "Talk to Elder Maren";
  if (flags.chiefDefeated) return "Return to Elder Maren";
  if (flags.questStarted) return "Defeat the goblin chief in the cave";
  return "Talk to Elder Maren in Oakhollow";
}
