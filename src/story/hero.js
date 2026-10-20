// Who the hero is: the name the player picks at NEW GAME (or later, from the bag), and the title they've earned,
// which people use as the story moves on. The roadmap's titles run Traveller, Hero of Oakhollow, Ironvale's Heir,
// Warden-in-training, Warden of Ironvale; only Act 1's exist so far. No Phaser here.

export const DEFAULT_NAME = "Hero";
export const MAX_NAME = 10;

// Highest first: the first one whose `earned` is true is the hero's title.
export const TITLES = [
  { id: "heroOfOakhollow", name: "Hero of Oakhollow", earned: f => !!f.kingDefeated },
  { id: "traveller", name: "Traveller", earned: () => true },
];

export const titleOf = flags => TITLES.find(t => t.earned(flags || {})).name;

/* A name as typed, made tidy: letters, spaces, hyphens and apostrophes only, at most MAX_NAME long, each word
   capitalised ("mARY-jane" becomes "Mary-Jane"). Empty means the default, "Hero". */
export function cleanName(raw) {
  const kept = String(raw ?? "").replace(/[^A-Za-z '-]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME).trim();
  const tidy = kept.toLowerCase().replace(/(^|[ '-])([a-z])/g, (m, sep, c) => sep + c.toUpperCase());
  return tidy || DEFAULT_NAME;
}

/* The hero's name for people to call them, or "" if they never picked one (so lines read well either way). */
export const callName = hero => (hero.name && hero.name !== DEFAULT_NAME ? hero.name : "");
