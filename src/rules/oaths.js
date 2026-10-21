// The Oath, sworn at the Door at the end of Act 3: one of three, for good. Each changes how the hero fights (a
// signature power, something always on, and a bonus for the companion with you), the hero's colours and title, and
// the people around them. The rules that use it are in combat.js and character.js (hero.oath); the Oath screen is
// scenes/Oath.js. No Phaser here.

export const OATHS = {
  iron: {
    name: "Oath of Iron", title: "Sworn of Iron", words: "I am the wall. What comes against the door comes first against me.",
    style: "The unbreakable defender. Grey steel, and a tower on your cape.",
    signature: "UNBROKEN: once per long rest, a blow that would drop you leaves you on 1 HP.",
    always: "Weapon hits on you do 3 less damage, and one Iron Ward a fight is free.",
    companion: "SHIELD ALLY: while you stand, your companion takes half damage from blows.",
  },
  storm: {
    name: "Oath of Storm", title: "Sworn of Storm", words: "I am the spark in the stone. The runes answer when I call.",
    style: "The spellblade. Blue, with sparks along the blade.",
    signature: "CHAIN LIGHTNING: a rune that strikes every monster (a DEX save halves it).",
    always: "Two more rune slots, and BLINK: the first blow that would hit you each fight misses.",
    companion: "A short rest brings back half your rune slots.",
  },
  dawn: {
    name: "Oath of Dawn", title: "Sworn of Dawn", words: "I am the light at the threshold. What is dead shall not pass.",
    style: "The holy warrior. Gold and white, and a faint glow.",
    signature: "DAWNSTRIKE: a rune after you hit, double against the undead and fiends.",
    always: "A healing light at the start of your turn (you and your companion), and you can't be frightened.",
    companion: "Your companion's healing spells heal more.",
  },
};
export const OATH_IDS = Object.keys(OATHS);

// What the companion with you thinks, on the Oath screen (they lean, but you choose).
export const OATH_OPINIONS = {
  megan: "MEGAN: \"Whatever you swear, I'll be right behind you. A bit behind. Behind a rock, probably.\"",
  robyn: "ROBYN: \"The Dawn answered me in that chapel. I think it would answer you. But it has to be your choice.\"",
  rachel: "RACHEL: \"Storm. The runes want someone who listens to them. ...Sorry. You choose. Obviously.\"",
};
export const NO_COMPANION_OPINION = "Colleen: \"I stood like a wall. You needn't. Choose the Oath you can keep.\"";

/* Swears an Oath, for good. Returns { ok, oath } or { ok: false, reason }. */
export function swearOath(hero, flags, id) {
  if (!OATHS[id]) return { ok: false, reason: `Unknown oath: ${id}` };
  if (hero.oath) return { ok: false, reason: "You've already sworn your Oath." };
  hero.oath = id;
  flags.oath = id;
  flags.oathSworn = true;
  flags[`oath${id[0].toUpperCase()}${id.slice(1)}`] = true; // oathIron, oathStorm, oathDawn: for the map's objects
  return { ok: true, oath: OATHS[id] };
}

// The hero's colours once sworn (letters from art/hero.js): the cape, the plume, the gold trim and the blade.
export const OATH_COLOURS = {
  iron: { c: "#5d6470", h: "#9aa5b1", g: "#c9d3dc", w: "#e9eef2" },
  storm: { c: "#2a62c8", h: "#7fd0ff", g: "#9fd0ff", w: "#cdeeff" },
  dawn: { c: "#f2ecd8", h: "#e8b84a", g: "#ffe28a", w: "#fff6d8" },
};
