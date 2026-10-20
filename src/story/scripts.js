// The conversations in the game so far: Elder Maren's two quests (the goblin chief, then the Goblin King), Pip,
// Old Tom the fisher, the fallen oak, the goblin cave, chests, the iron gate and the Goblin King, and inside the
// houses: Maren's journal, Hazel (Pip's mum) and Old Tom's spare bed. And resting: Nell at the Sleeping Fox inn (a
// long rest for gold) and the campfire at Goblin Rocks (a free short rest).
import { gainXp, rest, shortRest } from "../rules/character.js";
import { makeItem, itemName } from "../rules/items.js";
import { joinParty, companionStats } from "../rules/party.js";
import { tileOf, feetAt } from "../world/movement.js";
import { DEEP_CAVE } from "../world/cave.js";

export const QUEST_REWARD = { gold: 100, xp: 300 };
export const KING_REWARD = { gold: 250, xp: 1000 };
export const LOG_CHECKS = { shove: { ability: "STR", dc: 12 }, climb: { ability: "DEX", dc: 14 } };
export const GATE_CHECKS = { shove: { ability: "STR", dc: 13 }, climb: { ability: "DEX", dc: 15 } };
export const BOSS_FIGHT = ["goblinChief", "goblin"];
export const KING_FIGHT = ["goblinKing"];
export const INN_COST = 10; // a night at the Sleeping Fox

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
        text: "Elder Maren's journal. \"The chief served a KING, deep under the hills. Old stories say hobgoblins guard his tunnels, in armour that turns most blades. A Potion of Dexterity, to strike twice, would be worth every coin.\"",
      },
      hero: {
        text: "Elder Maren's journal. \"Today the Goblin King fell. I have written our hero's name in the village book, so Oakhollow never forgets.\" Your name is underlined. Twice.",
      },
    },
  },

  // Pip's mum, at home. She gives you a Potion of Healing the first time, and knows a thing or two.
  hazel: {
    start: s => (s.flags.metHazel ? "again" : "hello"),
    nodes: {
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
        text: s => (s.flags.kingDefeated
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
      },
    },
  },

  // Nell, who keeps the Sleeping Fox, Oakhollow's inn: a long rest for INN_COST gold. If you fainted, you were
  // carried in and woke here for free.
  inn: {
    start: "hello",
    nodes: {
      hello: {
        speaker: "NELL",
        text: s => (s.flags.kingDefeated
          ? `The hero of Oakhollow, in my inn! Your bed's ready: ${INN_COST} gold, same as anyone. Fair's fair.`
          : `Welcome to the Sleeping Fox! A soft bed and a hot supper, ${INN_COST} gold a night. You'll wake up good as new.`),
        choices: [
          { label: `Stay the night (${INN_COST} gold)`, to: "stay" },
          { label: "Not now", to: "bye" },
        ],
      },
      stay: {
        enter: (s, ctx) => {
          if (s.hero.gold < INN_COST) return ctx.goto("poor");
          s.hero.gold -= INN_COST;
          rest(s.hero);
          ctx.goto("slept");
        },
      },
      slept: {
        text: s => `${s.hero.companion ? "You both sleep like logs. Everyone's HP" : "You sleep like a log. HP"} and Second Wind restored. (-${INN_COST} gold)`,
      },
      poor: {
        speaker: "NELL",
        text: s => `It's ${INN_COST} gold, love, and you've only ${s.hero.gold}. The bank's just down the road, or Old Tom in Willowmere has a spare bed for nothing.`,
      },
      bye: { speaker: "NELL", text: "Mind how you go. The door's always open." },
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
          { label: "Not now", to: null },
        ],
      },
      rest: {
        enter: (s, ctx) => {
          const r = shortRest(s.hero, companionStats(s.hero)?.maxHp);
          ctx.remember("rest", r);
          if (!r.healed && !r.secondWind && !r.companionHealed) ctx.goto("rested");
        },
        text: (s, ctx) => {
          const r = ctx.recall("rest");
          const got = [r.healed && `+${r.healed} HP`, r.companionHealed && `${companionStats(s.hero).name} +${r.companionHealed} HP`, r.secondWind && "Second Wind back"].filter(Boolean);
          return `You warm your hands and catch your breath. ${got.join(", ")}. (A short rest brings you up to half your HP. For a full rest, find a bed.)`;
        },
      },
      rested: { text: "You're as rested as a fire can make you. A short rest brings you up to half your HP; for more, you need a bed." },
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

/* Side quests, shown on a second HUD line. */
export function sideObjective(flags) {
  if (flags.meganJoined) return "";
  if (flags.bowFound) return "Bring the bow back to Megan";
  if (flags.meganQuest) return "Find Megan's bow in the Whispering Wood";
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
