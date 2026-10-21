// The quest log: every quest you've heard of, what it's about, its steps and whether each is done. It's worked out
// from the quest flags every time, so there's nothing extra to save. No Phaser here, so it can be tested; the Quests
// screen shows what questLog returns.
import { QUEST_REWARD, KING_REWARD, SIGNET_REWARD, CAUSEWAY_REWARD, KEEP_REWARD } from "./scripts.js";
import { ROCKSLIDE_REWARD, stonesFound, GNASHER_REWARD, WAYSTONE_REWARD, ROAD_REWARD, MATTHEW_REWARD, CHAPEL_REWARD, arrowsFound } from "./act3.js";
import { actOf } from "./hero.js";

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
    id: "signet", title: "The Iron Signet", kind: "main",
    known: f => f.kingDefeated,
    about: "A ring of black iron from the Goblin King's throne, with the same crest as your sword. Someone in Oakhollow may know what it means.",
    reward: reward(SIGNET_REWARD),
    steps: [
      { text: "Take the ring from the Goblin King's throne", done: f => f.signetTaken },
      { text: "Free the smith chained behind the throne", done: f => f.brannocFreed },
      { text: "Show the ring to Elder Maren", done: f => f.signetShown },
      { text: "Ask Brannoc, by the smithy, about Ironvale", done: f => f.askedBrannoc },
      { text: "Wait for Brannoc to clear the goblins' passage", done: f => f.passageCleared },
      { text: "Climb the passage to Greywater Fen", done: f => f.seenFen },
      { text: "Tell Elder Maren what you found", done: f => f.fenReported },
    ],
  },
  {
    id: "causeway", title: "The Drowned Causeway", kind: "main",
    known: f => f.seenFen,
    about: "The old causeway to Ironvale Keep runs under black water. A marsh hag called Mother Sallow keeps it that way.",
    reward: reward(CAUSEWAY_REWARD),
    steps: [
      { text: "Find the drowned causeway, north of the fen", done: f => f.causewaySeen || f.metSallow || f.causewayRaised },
      { text: "Meet Mother Sallow at her hut", done: f => f.metSallow || f.causewayRaised },
      { text: "Raise the causeway: fight her, or strike a bargain", done: f => f.causewayRaised },
      { text: "Cross the causeway to Ironvale Keep", done: f => f.keepGateOpened },
    ],
  },
  {
    id: "keep", title: "Ironvale Keep", kind: "main",
    known: f => f.causewayRaised,
    about: "The dead walk Ironvale Keep, and the Iron Signet came from its tomb. Find out what lies at the bottom of it.",
    reward: reward(KEEP_REWARD),
    steps: [
      { text: "Open the keep's portcullis", done: f => f.keepGateOpened },
      { text: "Pull the lever in the courtyard", done: f => f.courtyardLever },
      { text: "Break the seal on the chapel altar", done: f => f.chapelSeal },
      { text: "Pull the lever in the armoury", done: f => f.armouryLever },
      { text: "Go down into Lord Varric's tomb", done: f => f.seenTomb || f.varricDefeated },
      { text: "Face Lord Varric", done: f => f.varricDefeated },
      { text: "Put the Iron Signet back on his tomb", done: f => f.signetReturned },
      { text: "Tell Brannoc what Varric called you", done: f => f.bladeReforged },
    ],
  },
  {
    id: "rockslide", title: "The Scholar at the Rockslide", kind: "main",
    known: f => actOf(f) >= 3,
    about: "The keep shook in the night, and the shaking came from the Mountain Pass, where the old road is buried under a rockslide.",
    reward: reward(ROCKSLIDE_REWARD),
    steps: [
      { text: "Hear Hild's news", done: f => f.heardTremor || f.metRachel },
      { text: "Go to the rockslide, north of the keep", done: f => f.metRachel },
      { text: "Find the three rune-stones on the keep's grounds", done: f => stonesFound(f) === 3 },
      { text: "Lay the Wardenblade against the rune with Rachel", done: f => f.rockslideOpen },
    ],
  },
  {
    id: "road", title: "The Warden's Road", kind: "main",
    known: f => f.rockslideOpen,
    about: "Three waystones line the old road up the pass, each with a rune for a Warden who passes its trial. Thorne is ahead, stealing the runes as he goes.",
    reward: `${3 * WAYSTONE_REWARD.gold + ROAD_REWARD.gold} gold, ${3 * WAYSTONE_REWARD.xp + ROAD_REWARD.xp} XP, three runes`,
    steps: [
      { text: "Climb to the first waystone", done: f => f.metColleen || f.waystoneIron },
      { text: "Pass the trial of Iron", done: f => f.waystoneIron },
      { text: "Pass the trial of the Call, above the snowfield", done: f => f.waystoneCall },
      { text: "Find the third waystone, on the heights", done: f => f.bindingStolen || f.bindingRecovered },
      { text: "Take the Rune of Binding back from Thorne's camp", done: f => f.bindingRecovered },
      { text: "Bring it back to Colleen at the third waystone", done: f => f.wardensRoad },
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
    id: "robyn", title: "The Restless Dead", kind: "side",
    known: f => f.robynQuest || f.gravesAtRest || f.robynJoined,
    about: "Robyn, a young cleric at Fenwatch's shrine, says the fen's old graves keep giving up ghouls.",
    reward: "Robyn joins your party",
    steps: [
      { text: "Meet Robyn at Fenwatch's shrine", done: f => f.robynQuest || f.robynJoined },
      { text: "Beat the ghouls at the old graves, west in the fen", done: f => f.gravesAtRest },
      { text: "Go back to Robyn", done: f => f.robynJoined },
    ],
  },
  {
    id: "tools", title: "Brannoc's Tools", kind: "side",
    known: f => f.toolsFound,
    about: "Brannoc's own toolbox, somehow, in the keep's armoury.",
    reward: "Brannoc silvers your weapon",
    steps: [
      { text: "Find the toolbox in the keep's armoury", done: f => f.toolsFound },
      { text: "Bring it to Brannoc's forge in Fenwatch", done: f => f.toolsReturned },
    ],
  },
  {
    id: "matthew", title: "Matthew's Arrows", kind: "side",
    known: f => f.matthewQuest,
    about: "Megan's father went up the pass ten years ago and never came back. She's found one of his arrows in the snow.",
    reward: `${MATTHEW_REWARD.xp} XP, and Megan learns Volley`,
    steps: [
      { text: "Find Matthew's arrows along the pass (Megan knows them)", done: f => arrowsFound(f) === 3 || f.matthewFound },
      { text: "Follow them to the old watchtower, with Megan", done: f => f.matthewFound },
    ],
  },
  {
    id: "chapel", title: "The Frozen Chapel", kind: "side",
    known: f => f.chapelQuest,
    about: "A Warden chapel high on the pass, gone cold and full of the dead. Robyn thinks the light she prays to is waiting there.",
    reward: `${CHAPEL_REWARD.xp} XP, and Robyn learns Turn Undead and Spiritual Weapon`,
    steps: [
      { text: "Find the Frozen Chapel, east of the snowfield", done: f => f.seenFrozenChapel || f.chapelLit },
      { text: "Let Robyn light the altar (she must be with you)", done: f => f.chapelLit },
    ],
  },
  {
    id: "pip", title: "Pip's Big Adventure", kind: "side",
    known: f => f.pipRanAway,
    about: "Pip has run away to be a Warden like you. His note says not to worry. Hazel is worrying.",
    reward: "Pip's Junior Warden badge, 1000 XP",
    steps: [
      { text: "Ask Hazel what happened", done: f => f.hazelPipNews || f.pipShieldFound || f.pipFound },
      { text: "Follow Pip's trail through the Whispering Wood", done: f => f.pipShieldFound || f.pipChalkFound || f.pipFound },
      { text: "Find where the trail leads", done: f => f.pipChalkFound || f.pipMetWarrens || f.pipFound },
      { text: "Find Pip in the Deep Warrens", done: f => f.pipMetWarrens || f.koboldsGone },
      { text: "Chase off the kobolds", done: f => f.koboldsGone },
      { text: "See Pip and Hazel at home", done: f => f.pipRewarded },
    ],
  },
  {
    id: "gnasher", title: "Old Gnasher", kind: "side",
    known: f => f.gnasherQuest,
    about: "Old Tom's letter: the legendary pike of Willowmere is biting at last.",
    reward: reward(GNASHER_REWARD),
    steps: [
      { text: "Read Old Tom's letter (Hazel has it)", done: f => f.gnasherQuest },
      { text: "Catch Old Gnasher with Tom's rod and take him to Tom", done: f => f.gnasherCaught },
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
