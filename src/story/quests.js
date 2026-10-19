// The quest log: every quest you've heard of, what it's about, its steps and whether each is done. It's worked out
// from the quest flags every time, so there's nothing extra to save. No Phaser here, so it can be tested; the Quests
// screen shows what questLog returns.
import { QUEST_REWARD, KING_REWARD } from "./scripts.js";

const reward = r => `${r.gold} gold, ${r.xp} XP`;

// In the order the log lists them (unfinished quests come first). `known` says when a quest shows up in the log.
export const QUESTS = [
  {
    id: "chief", title: "The Goblin Chief", kind: "main",
    known: () => true,
    about: "Goblins raid Oakhollow from a cave past Goblin Rocks. Elder Maren wants their chief driven out.",
    reward: reward(QUEST_REWARD),
    steps: [
      { text: "Talk to Elder Maren in Oakhollow", done: f => f.questStarted || f.chiefDefeated },
      { text: "Get past the fallen oak on the path through the wood", done: f => f.logCleared || f.logPassed || f.chiefDefeated },
      { text: "Defeat the goblin chief in the cave", done: f => f.chiefDefeated },
      { text: "Return to Elder Maren", done: f => f.questRewarded },
    ],
  },
  {
    id: "king", title: "The Goblin King", kind: "main",
    known: f => f.questRewarded || f.kingDefeated,
    about: "The chief served a Goblin King, deep in the tunnels behind his throne. Elder Maren wants him beaten too.",
    reward: reward(KING_REWARD),
    steps: [
      { text: "Hear about the King from Elder Maren", done: f => f.kingQuestStarted || f.kingDefeated },
      { text: "Get through the iron gate in the Deep Warrens", done: f => f.gateOpened || f.gatePassed || f.kingDefeated },
      { text: "Defeat the Goblin King", done: f => f.kingDefeated },
      { text: "Return to Elder Maren", done: f => f.kingRewarded },
    ],
  },
  {
    id: "bow", title: "Megan's Bow", kind: "side",
    known: f => f.meganQuest || f.bowFound || f.meganJoined,
    about: "Megan, a young archer in Willowmere, dropped her bow chasing a wolf through the Whispering Wood.",
    reward: "Megan joins your party",
    steps: [
      { text: "Meet Megan in Willowmere", done: f => f.meganQuest || f.meganJoined },
      { text: "Find her bow in the far east of the Whispering Wood", done: f => f.bowFound },
      { text: "Bring the bow back to Megan", done: f => f.meganJoined },
    ],
  },
  {
    id: "willowmere", title: "Willowmere Treasure", kind: "side",
    known: f => f.metTom,
    about: "Old Tom the fisher says there's treasure hidden around Willowmere, if you know where to look.",
    steps: [
      { text: "Open the chest on the little island", done: f => f.isleChestOpened },
      { text: "Find the chest in the old garden, south-west", done: f => f.gardenChestOpened },
      { text: "Find the chest in the bramble grove, east", done: f => f.groveChestOpened },
    ],
  },
];

/* The quests you know about, unfinished first: { id, title, kind, about, reward, done, steps: [{ text, done, current }] }.
   `current` marks the first step still to do. */
export function questLog(flags = {}) {
  const log = QUESTS.filter(q => q.known(flags)).map(q => {
    const steps = q.steps.map(st => ({ text: st.text, done: !!st.done(flags), current: false }));
    const next = steps.find(st => !st.done);
    if (next) next.current = true;
    return { id: q.id, title: q.title, kind: q.kind, about: q.about, reward: q.reward || "", done: !next, steps };
  });
  return [...log.filter(q => !q.done), ...log.filter(q => q.done)];
}
