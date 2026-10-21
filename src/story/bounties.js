// The bounty board in Fenwatch's tavern: hunts you can take, one at a time, and take again once they're paid. A hunt
// counts the monsters of its kind you beat after taking it (from the bestiary's tally), so nothing else needs saving
// but state.bounty = { id, start }. `label` is the notice's short name on the board's buttons. No Phaser here.
import { MONSTERS } from "../data/monsters.js";
import { gainXp } from "../rules/character.js";

// `act`: the board shows Act 2's hunts until Act 3 begins, then the pass's.
export const BOUNTIES = [
  { id: "frogs", title: "Frogs in the cistern", label: "Frogs", monster: "giantFrog", count: 6, gold: 120, xp: 300 },
  { id: "lizardfolk", title: "Lizardfolk raiders", label: "Lizardfolk", monster: "lizardfolk", count: 5, gold: 200, xp: 500 },
  { id: "ghouls", title: "Ghouls on the causeway", label: "Ghouls", monster: "ghoul", count: 4, gold: 300, xp: 600 },
  { id: "wisps", title: "Lights over the water", label: "Wisps", monster: "willOWisp", count: 2, gold: 300, xp: 700 },
  { id: "griffons", title: "Griffons on the slopes", label: "Griffons", monster: "griffon", count: 4, gold: 500, xp: 2000, act: 3 },
  { id: "trolls", title: "Trolls on the snowfield", label: "Trolls", monster: "troll", count: 3, gold: 600, xp: 3000, act: 3 },
  { id: "wyverns", title: "Wyverns over the heights", label: "Wyverns", monster: "wyvern", count: 2, gold: 700, xp: 3500, act: 3 },
];
/* The hunts on the board in this act. */
export const boardFor = act => BOUNTIES.filter(b => (b.act || 2) === (act >= 3 ? 3 : 2));
export const bountyById = id => BOUNTIES.find(b => b.id === id) || null;

const beaten = (state, monster) => state.bestiary?.[monster]?.beaten || 0;

/* The hunt you're on: { bounty, done (how many so far, at most its count), finished }, or null. */
export function currentBounty(state) {
  const bounty = bountyById(state.bounty?.id);
  if (!bounty) return null;
  const done = Math.min(bounty.count, Math.max(0, beaten(state, bounty.monster) - state.bounty.start));
  return { bounty, done, finished: done >= bounty.count };
}

export function takeBounty(state, id) {
  const bounty = bountyById(id);
  if (!bounty) return { ok: false, reason: "No such notice." };
  if (state.bounty) return { ok: false, reason: "Finish the hunt you're on first." };
  state.bounty = { id, start: beaten(state, bounty.monster) };
  return { ok: true, bounty };
}

/* Pays a finished hunt and takes its notice down (you can take it again). Returns { ok, bounty, levelUps }. */
export function claimBounty(state, rng = Math.random) {
  const c = currentBounty(state);
  if (!c?.finished) return { ok: false, reason: "That hunt isn't done yet." };
  state.hero.gold += c.bounty.gold;
  const { levelUps } = gainXp(state.hero, c.bounty.xp, rng);
  delete state.bounty;
  return { ok: true, bounty: c.bounty, levelUps };
}

export function dropBounty(state) {
  delete state.bounty;
}

/* A hunt's progress for the HUD: "Bounty: 2/4 ghouls". */
export function bountyLine(state) {
  const c = currentBounty(state);
  if (!c) return "";
  return c.finished ? "Bounty done: claim it at the Drowned Duck" : `Bounty: ${c.done}/${c.bounty.count} ${MONSTERS[c.bounty.monster].name}s`;
}

/* A saved hunt the game still knows, or undefined. */
export function cleanBounty(b) {
  return b && bountyById(b.id) && Number.isInteger(b.start) && b.start >= 0 ? { id: b.id, start: b.start } : undefined;
}
