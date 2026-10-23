// Campfire talks and remarks: the companions opening up in Act 3.
// - A talk is a short scene that plays after you rest (a camp's fire, an inn, your bed at the keep) when the companion
//   with you has something to say. Each companion has three, in order, and each waits for a story flag (`needs`), so
//   nobody tells you everything on the first night. The count is saved on the companion (`talks`). A companion's
//   third talk opens their personal quest (`opens`, a flag).
// - A remark is one line a companion says the first time you walk into a zone with them (shown as a note).
// No Phaser here: the rest scripts in scripts.js add talkNodes() and go to "talk" after a rest.
import { actOf } from "./hero.js";

const MEGAN = "MEGAN", ROBYN = "ROBYN", RACHEL = "RACHEL";

// Each talk: { id, needs (flags), lines: [[speaker, text]] (speaker null for narration), opens (a flag) }.
export const TALKS = {
  megan: [
    { id: "megan1", needs: () => true, lines: [
      [null, "The fire crackles. Megan turns her bow over and over in her hands."],
      [MEGAN, "Can I tell you something? My da was an archer, in Fenwatch. Corwin. Ten years ago he went up the mountain pass with a survey party, and none of them came back."],
      [MEGAN, "Mum took me to Willowmere after. This bow was his. Sometimes I think: if the pass ever opens, I could go up and look. Silly, isn't it?"],
    ] },
    { id: "megan2", needs: f => !!f.rockslideOpen, lines: [
      [MEGAN, "I need to say this before we go any higher. I'm scared of heights. Properly scared. Trees are fine. Cliffs are NOT fine."],
      [MEGAN, "Da used to carry me up the Fenwatch watchtower with my eyes shut. \"Look at the sky, Meg, not the ground.\" I'm trying. I really am."],
    ] },
    { id: "megan3", needs: f => !!f.wardenTraining, opens: "matthewQuest", lines: [
      [MEGAN, "I found one of Da's arrows today, in the snow by the old road. Grey goose feathers, and a little nick in each: his mark. Nobody else fletches like that."],
      [MEGAN, "It's been ten years. But if there's one, there might be more. Will you help me follow them? Please?"],
      [null, "(A new side quest: Corwin's Arrows. Look for his arrows along the pass, with Megan in your party.)"],
    ] },
  ],
  robyn: [
    { id: "robyn1", needs: () => true, lines: [
      [null, "Robyn lights a candle from the fire, out of habit, and sets it on a stone."],
      [ROBYN, "I was left on the shrine's step as a baby. Wrapped in sailcloth, with a candle beside me. Old Mother Teasel raised me and taught me the prayers."],
      [ROBYN, "For years I prayed and nothing answered. I kept the candles lit anyway. Stubbornness, mostly."],
    ] },
    { id: "robyn2", needs: f => !!f.rockslideOpen, lines: [
      [ROBYN, "The night you laid the fen's graves to rest, something answered me at last. Warm, like a hand on my shoulder. I cried all over the candles."],
      [ROBYN, "It's grown stronger since the keep. I can feel it up there in the mountains now. As if it's waiting for us."],
    ] },
    { id: "robyn3", needs: f => !!f.wardenTraining, opens: "chapelQuest", lines: [
      [ROBYN, "Colleen said a word at the waystone, carved under the Wardens' sun: Dawn. That's it. That's the light I pray to. It has an old name, and it's theirs."],
      [ROBYN, "There's a Warden chapel high on the pass, she said, gone cold and full of the dead. If anyone can light it again... I think it has to be me. Will you take me?"],
      [null, "(A new side quest: The Frozen Chapel. Find it high on the pass, with Robyn in your party.)"],
    ] },
  ],
  rachel: [
    { id: "rachel1", needs: () => true, lines: [
      [null, "Rachel reads by the firelight. Quill sits on her shoulder, pretending not to read too."],
      [RACHEL, "I studied at the college in the foothills. Thorne taught there. He was kind, once: he'd stay up all night with a student over one stubborn carving. He made runes sound like poetry."],
      [RACHEL, "We'll need rope for the pass. Lots of rope. My sister would have climbed it without any. She climbed everything."],
    ] },
    { id: "rachel2", needs: f => !!f.wardenTraining, lines: [
      [RACHEL, "I have to tell you something. Thorne didn't work out how to lift a rune out of stone. I did. Six years of my life, and he just... used it."],
      [RACHEL, "Every rune he takes is gone from the carvings for good. That's on me. So I'm going to stop him. You'd do the same. She'd have liked you, you know. She liked everyone. I never understood how."],
    ] },
    { id: "rachel3", needs: f => !!f.bindingRecovered, lines: [
      [RACHEL, "You've noticed Quill won't go near Thorne's things. She used to sleep on his books. Then one night she flew at him, screeching, and she's hated him ever since. Owls know."],
      [RACHEL, "Do you want to know why I really study runes? Someone I love went through a gap in that door when we were twelve. Runes are the only way through. Thorne promised to help me find a way."],
    ] },
  ],
};

/* The talk the companion with you would tell now, or null. */
export function nextTalk(state) {
  const c = state.hero.companion, t = TALKS[c?.id]?.[c.talks || 0];
  return t && actOf(state.flags) >= 3 && t.needs(state.flags) ? t : null;
}

/* The nodes a rest script needs for talks: "talk" plays the next one, if there is one. */
export function talkNodes() {
  const nodes = { talk: { enter: (s, ctx) => { const t = nextTalk(s); ctx.goto(t ? `${t.id}_0` : null); } } };
  for (const t of Object.values(TALKS).flat()) {
    t.lines.forEach(([speaker, text], i) => {
      nodes[`${t.id}_${i}`] = {
        speaker: speaker || "", text, to: i < t.lines.length - 1 ? `${t.id}_${i + 1}` : null,
        ...(i === 0 && { enter: s => { s.hero.companion.talks = (s.hero.companion.talks || 0) + 1; if (t.opens) s.flags[t.opens] = true; } }),
      };
    });
  }
  return nodes;
}

/* The answers at the end of a rest: carry on to a talk, or close. */
export const afterRest = [
  { label: "Continue", to: "talk", if: s => !!nextTalk(s) },
  { label: "Close", to: null, if: s => !nextTalk(s) },
];

// Remarks: zone id -> { companion id: line }, with `when` (flags) for when the zone is worth a remark.
export const REMARKS = {
  courtyard: { when: f => actOf(f) >= 3,
    megan: "Home sweet haunted home. I've picked the room furthest from the tomb.",
    robyn: "The dead here sleep well now. I can feel it. It's... nice?",
    rachel: "A Warden keep, and nobody has read its walls in a hundred years. I'm going to be up all night." },
  pass: { when: f => actOf(f) >= 3,
    megan: "Big rocks. Very big rocks. Who throws rocks like that?",
    robyn: "Something burned here. Not fire. Something older.",
    rachel: "That's not a rockslide. That's a Breaking Rune. I'd know his hand anywhere." },
  snowfield: { when: () => true,
    megan: "Ice! Ice is fine. Ice is flat. I like flat.",
    robyn: "It's so quiet up here. Like a held breath.",
    rachel: "Slide in a straight line, stop at the rocks. A puzzle. Wardens loved puzzles. Wardens were insufferable." },
  heights: { when: () => true,
    megan: "Don't look down. Don't look down. I looked down.",
    robyn: "The light's different up here. Closer.",
    rachel: "Thorne's been this way. The air tastes of burnt runes." },
  slopes: { when: () => true,
    megan: "I'm not looking down. Don't make me look down.",
    robyn: "Feel that wind? Clean. Nothing dead up here. Yet.",
    rachel: "The old Warden road. Every stone of it was laid by hand, up a mountain. Imagine." },
};

/* The line the companion with you has for this zone, the first time: { name, line, flag } or null. */
export function remarkFor(state, zoneId, names) {
  const c = state.hero.companion, r = REMARKS[zoneId];
  const flag = `remark_${zoneId}_${c?.id}`;
  if (!c || !r?.[c.id] || state.flags[flag] || !r.when(state.flags)) return null;
  return { name: names[c.id], line: r[c.id], flag };
}
