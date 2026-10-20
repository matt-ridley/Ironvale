// The people (and things) who run the minigames: talk to them, and PLAY opens the game's screen (src/scenes/, through
// a "minigame" event the conversation screen acts on). The rules are in rules/minigames.js.
import { KB_STAKE, MEGAN_SCORE, ARROWS, FISH_PER_REST, fishLeft, PRIZES } from "../rules/minigames.js";

const play = (key, data = {}) => (s, ctx) => ctx.emit({ type: "minigame", key, data });
const meganAround = s => s.hero.companion?.id === "megan" || !!s.hero.roster?.some(r => r.id === "megan");

/* A knucklebones player at an inn's table (Wat at the Sleeping Fox, Sal at the Drowned Duck). */
function knucklebones(host) {
  return {
    start: "hello",
    nodes: {
      hello: {
        speaker: host,
        text: s => (s.flags[PRIZES.knucklebones.flag]
          ? `Back for more? ${KB_STAKE} gold a game, winner takes ${KB_STAKE * 2}. And don't think that lucky die makes you special.`
          : `Fancy a game of knucklebones? ${KB_STAKE} gold a game, winner takes ${KB_STAKE * 2}. Beat me once and you can have my lucky die. Hasn't done me much good.`),
        choices: [
          { label: `Play (${KB_STAKE} gold)`, to: "play" },
          { label: "How do you play?", to: "rules" },
          { label: "Not now", to: null },
        ],
      },
      rules: {
        speaker: host,
        text: "Roll a die, drop it in one of your three columns. Two the same in a column count double each, three count triple. Match one of my dice and you knock mine out. Board full, game over: most points wins.",
        choices: [{ label: `Play (${KB_STAKE} gold)`, to: "play" }, { label: "Not now", to: null }],
      },
      play: {
        enter: (s, ctx) => (s.hero.gold < KB_STAKE ? ctx.goto("poor") : play("Knucklebones", { host })(s, ctx)),
      },
      poor: { speaker: host, text: `It's ${KB_STAKE} gold a game, friend. Come back when your purse jingles.` },
    },
  };
}

export const GAME_SCRIPTS = {
  diceWat: knucklebones("WAT"),
  diceSal: knucklebones("SAL"),

  // Big Oswin, the woodcutter, at the Sleeping Fox.
  armWrestle: {
    start: "hello",
    nodes: {
      hello: {
        speaker: "OSWIN",
        text: s => (s.flags[PRIZES.armWrestle.flag]
          ? "Rematch? I've been splitting logs all week for this. No belt this time: just the glory."
          : "Arm wrestle? Nobody's beaten Big Oswin in eleven years. Beat me and you can have my belt. Lose, and you buy nothing: I'm not a thief."),
        choices: [
          { label: "Arm wrestle", to: "play" },
          { label: "How does it work?", to: "rules" },
          { label: "Not now", to: null },
        ],
      },
      rules: {
        speaker: "OSWIN",
        text: "A marker swings along the bar. Tap when it's in the green and you push; tap outside it and you slip. I push all the while, and it gets quicker. Stronger arms push further.",
        choices: [{ label: "Arm wrestle", to: "play" }, { label: "Not now", to: null }],
      },
      play: { enter: play("ArmWrestle") },
    },
  },

  // The archery target in Oakhollow: Megan's contest, once she's travelling with you (or waiting at an inn).
  archery: {
    start: s => (meganAround(s) ? "hello" : "alone"),
    nodes: {
      alone: { text: "A straw target, bristling with arrows. None of them anywhere near the middle." },
      hello: {
        speaker: "MEGAN",
        text: s => (s.flags[PRIZES.archery.flag]
          ? `Again? You're on. Five arrows each. I'm still on ${MEGAN_SCORE}.`
          : `A contest! The Elder's promised a willow longbow to whoever wins. Five arrows each, and I scored ${MEGAN_SCORE} this morning. If you win it... well, you don't even use a bow.`),
        choices: [
          { label: "You're on!", to: "play" },
          { label: "How does it work?", to: "rules" },
          { label: "Not now", to: null },
        ],
      },
      rules: {
        speaker: "MEGAN",
        text: `Your aim drifts round the target: tap to loose an arrow. Middle's 10, then 8, 6, 4 and 2. ${ARROWS} arrows. Beat my ${MEGAN_SCORE}. A steady hand (DEX) drifts less.`,
        choices: [{ label: "You're on!", to: "play" }, { label: "Not now", to: null }],
      },
      play: { enter: play("Archery") },
    },
  },

  // A fishing rod by the water (Old Tom's at Willowmere, the jetty at Fenwatch). The object says where (`spot`).
  fishing: {
    start: s => (fishLeft(s.hero) ? "hello" : "quiet"),
    nodes: {
      hello: {
        text: (s, ctx) => `${ctx.object?.look ?? "A fishing rod."} (Fish bite ${fishLeft(s.hero)} more time${fishLeft(s.hero) === 1 ? "" : "s"} before you next sleep.)`,
        choices: [{ label: "Fish", to: "play" }, { label: "Not now", to: null }],
      },
      play: { enter: (s, ctx) => play("Fishing", { spot: ctx.object?.spot || "willowmere" })(s, ctx) },
      quiet: { text: `The fish have stopped biting: you've caught ${FISH_PER_REST} since you last slept. Come back after a night's rest.` },
    },
  },
};
