// The conversations in the game so far: Elder Maren's quest, a villager, the fallen oak, and the goblin cave.
import { gainXp } from "../rules/character.js";

export const QUEST_REWARD = { gold: 100, xp: 300 };
export const LOG_CHECKS = { shove: { ability: "STR", dc: 12 }, climb: { ability: "DEX", dc: 14 } };
export const BOSS_FIGHT = ["goblinChief", "goblin"];

const ELDER = "ELDER MAREN";

export const SCRIPTS = {
  elder: {
    start: s => (s.flags.questRewarded ? "after" : s.flags.chiefDefeated ? "thanks" : s.flags.questStarted ? "reminder" : "intro"),
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
      },
      after: { speaker: ELDER, text: "Oakhollow sleeps easier thanks to you. The wood is still wild, mind. Keep your blade sharp." },
    },
  },

  villager: {
    start: "hello",
    nodes: {
      hello: {
        speaker: "PIP",
        text: s => (s.flags.chiefDefeated
          ? "You beat the goblin chief? Wait till I tell the sheep!"
          : "Stick to the paths in the wood. The wolves come out of the trees, but less often on the paths."),
      },
    },
  },

  log: {
    start: "look",
    nodes: {
      look: {
        text: "A huge fallen oak blocks the path.",
        choices: [
          { label: `Shove it aside (STR, DC ${LOG_CHECKS.shove.dc})`, to: "shove" },
          { label: `Climb over (DEX, DC ${LOG_CHECKS.climb.dc})`, to: "climb" },
          { label: "Leave it", to: null },
        ],
      },
      shove: {
        enter: (s, ctx) => {
          const r = ctx.check(LOG_CHECKS.shove.ability, LOG_CHECKS.shove.dc);
          if (r.success) { s.flags.logCleared = true; ctx.goto("shoved"); } else ctx.goto("hurt");
        },
      },
      climb: {
        enter: (s, ctx) => {
          const r = ctx.check(LOG_CHECKS.climb.ability, LOG_CHECKS.climb.dc);
          if (!r.success) return ctx.goto("hurt");
          // Land on the far side: as far past the oak as you stand in front of it.
          const o = ctx.object;
          if (o) s.pos = { x: 2 * o.x - s.pos.x, y: 2 * o.y - s.pos.y };
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
        text: (s, ctx) => `${ctx.checkText} You scrape your hands on the bark. -${ctx.recall("hurt")} HP.`,
        choices: [
          { label: "Try again", to: "look" },
          { label: "Leave it", to: null },
        ],
      },
      shoved: { text: (s, ctx) => `${ctx.checkText} With a mighty heave, the oak rolls into the ditch. The path is clear.` },
      climbed: { text: (s, ctx) => `${ctx.checkText} You scramble over the trunk and drop down on the other side.` },
    },
  },

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
      quiet: { text: "The cave is quiet now. Only the smell of goblin remains." },
    },
  },
};

/* The line under the HP box saying what to do next. */
export function objective(flags) {
  if (flags.questRewarded) return "";
  if (flags.chiefDefeated) return "Return to Elder Maren";
  if (flags.questStarted) return "Defeat the goblin chief in the cave";
  return "Talk to Elder Maren in Oakhollow";
}
