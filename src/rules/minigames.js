// The minigames' rules: knucklebones, arm wrestling, the archery contest and fishing. No Phaser here, so they can be
// tested; each has a screen in src/scenes/ that runs the clock and the taps. Every game is free to play (knucklebones
// takes a small stake), and the first win of each brings a one-off prize (PRIZES).
import { rollDie } from "./dice.js";
import { mod } from "./character.js";
import { makeItem } from "./items.js";

// ---------------------------------------------------------------- Knucklebones
// Two 3 x 3 boards, one each. Roll a d6 and drop it into one of your three columns. Matching dice in a column multiply:
// a column scores each die times how many of that number it holds (two 4s are 4x2 + 4x2 = 16). Dropping a die knocks
// every die of the same number out of your opponent's column opposite. When either board is full, the higher score wins.
export const KB_STAKE = 10;

export function kbNew(rng = Math.random) {
  return { boards: [[[], [], []], [[], [], []]], turn: rng() < 0.5 ? 0 : 1, die: null, over: false };
}

export function kbColumnScore(col) {
  return col.reduce((sum, v) => sum + v * col.filter(d => d === v).length, 0);
}
export const kbScore = board => board.reduce((s, col) => s + kbColumnScore(col), 0);
export const kbScores = g => [kbScore(g.boards[0]), kbScore(g.boards[1])];

/* The player whose turn it is (0: you, 1: your opponent) rolls their die. */
export function kbRoll(g, rng = Math.random) {
  if (g.over || g.die) return g.die;
  g.die = rollDie(6, rng);
  return g.die;
}

/* Drops the rolled die into column `col` of the current player's board. Returns { ok, knocked } (dice knocked out). */
export function kbPlace(g, col) {
  const mine = g.boards[g.turn], theirs = g.boards[1 - g.turn];
  if (g.over || !g.die) return { ok: false, reason: "Roll first." };
  if (!mine[col] || mine[col].length >= 3) return { ok: false, reason: "That column's full." };
  const die = g.die;
  mine[col].push(die);
  const knocked = theirs[col].filter(d => d === die).length;
  theirs[col] = theirs[col].filter(d => d !== die);
  g.die = null;
  if (mine.every(c => c.length === 3)) g.over = true;
  else g.turn = 1 - g.turn;
  return { ok: true, die, col, knocked };
}

/* The opponent's choice: the column that gains them the most, counting what it knocks off your board. */
export function kbBestColumn(g) {
  const mine = g.boards[g.turn], theirs = g.boards[1 - g.turn];
  let best = -1, bestGain = -Infinity;
  mine.forEach((col, i) => {
    if (col.length >= 3) return;
    const gain = kbColumnScore([...col, g.die]) - kbColumnScore(col) + kbColumnScore(theirs[i]) - kbColumnScore(theirs[i].filter(d => d !== g.die));
    if (gain > bestGain) { bestGain = gain; best = i; }
  });
  return best;
}

/* 0 if you won, 1 if your opponent did, -1 for a draw (or a game still going). */
export function kbWinner(g) {
  if (!g.over) return -1;
  const [a, b] = kbScores(g);
  return a > b ? 0 : b > a ? 1 : -1;
}

// ---------------------------------------------------------------- Arm wrestling
// A marker sweeps along a bar; tap while it's in the middle (the green) to push. A tap outside the green slips.
// Your opponent pushes all the time, and the marker speeds up as the bout goes on. Push them to 100 to win, and
// you lose at 0. A stronger arm (STR) pushes further with every good tap.
export const AW_ZONE = 0.13; // half the green's width, as a share of the bar
export const AW_SLIP = 4;
export const AW_FOE_RATE = 12; // how hard Oswin pushes, per second

export function awNew(hero) {
  return { pos: 50, t: 0, cursor: 0, dir: 1, push: 8 + 2 * mod(hero, "STR"), result: null };
}
export const awSpeed = g => 1.2 + g.t * 0.08; // bar widths per second

export function awTick(g, dt) {
  if (g.result) return g;
  g.t += dt;
  let c = g.cursor + g.dir * awSpeed(g) * dt;
  while (c > 1 || c < 0) { if (c > 1) { c = 2 - c; g.dir = -1; } else { c = -c; g.dir = 1; } }
  g.cursor = c;
  g.pos -= AW_FOE_RATE * dt;
  if (g.pos <= 0) { g.pos = 0; g.result = "lost"; }
  return g;
}
export const awInZone = g => Math.abs(g.cursor - 0.5) <= AW_ZONE;

/* A tap: a push in the green, a slip outside it. Returns true for a good tap. */
export function awTap(g) {
  if (g.result) return false;
  const good = awInZone(g);
  g.pos = Math.max(0, Math.min(100, g.pos + (good ? g.push : -AW_SLIP)));
  if (g.pos >= 100) g.result = "won";
  else if (g.pos <= 0) g.result = "lost";
  return good;
}

// ---------------------------------------------------------------- Archery
// Five arrows at a straw target. Your aim drifts in a loop across it (a steadier hand, higher DEX, drifts less); tap
// to loose. Rings score 10, 8, 6, 4 and 2. Beat Megan's score to win.
export const ARROWS = 5;
export const MEGAN_SCORE = 34;
export const RINGS = [[0.12, 10], [0.3, 8], [0.5, 6], [0.72, 4], [1, 2]]; // [radius as a share of the target, score]

export function archNew(hero) {
  return { t: 0, scores: [], drift: Math.max(0.55, 0.9 - 0.08 * mod(hero, "DEX")), last: null };
}
/* Where your aim is now, in target radii from the centre. */
export function archAim(g) {
  const k = 1 + g.scores.length * 0.08; // each arrow a little shakier
  return { x: g.drift * Math.sin(g.t * 1.6 * k), y: g.drift * Math.sin(g.t * 2.3 * k + 1) };
}
export const archTick = (g, dt) => { g.t += dt; return g; };
export function ringScore(x, y) {
  const d = Math.hypot(x, y);
  return RINGS.find(([r]) => d <= r)?.[1] ?? 0;
}
/* Looses an arrow where you're aiming. Returns { x, y, score }. */
export function archShoot(g) {
  if (g.scores.length >= ARROWS) return null;
  const { x, y } = archAim(g);
  const score = ringScore(x, y);
  g.scores.push(score);
  g.last = { x, y, score };
  return g.last;
}
export const archTotal = g => g.scores.reduce((a, b) => a + b, 0);
export const archDone = g => g.scores.length >= ARROWS;

// ---------------------------------------------------------------- Fishing
// Cast, and wait for a bite (tap too soon and you scare it off). When the float dips, tap quickly to hook it, then
// tap fast to reel it in before it pulls free: the bigger the fish, the harder it pulls. The fish stop biting after
// FISH_PER_REST catches, until you've had a night's sleep.
export const FISH_PER_REST = 5;
export const BITE_WINDOW = 1; // seconds to strike once the float dips
export const REEL_TAP = 0.1;
export const FISH = {
  perch: { pull: 0.15 }, pike: { pull: 0.3 }, fenEel: { pull: 0.4 }, goldenCarp: { pull: 0.5 },
};
export const FISHING_SPOTS = {
  willowmere: { name: "Willowmere", catch: [["perch", 0.55], ["pike", 0.35], ["goldenCarp", 0.1]] },
  fenwatch: { name: "Fenwatch", catch: [["perch", 0.3], ["fenEel", 0.55], ["goldenCarp", 0.15]] },
};

export function fishNew(spot, rng = Math.random) {
  return { spot, phase: "wait", t: 0, biteAt: 1.5 + rng() * 3, fish: null, reel: 0 };
}
export function pickFish(spot, rng = Math.random) {
  let r = rng();
  for (const [id, chance] of FISHING_SPOTS[spot].catch) { if (r < chance) return id; r -= chance; }
  return FISHING_SPOTS[spot].catch[0][0];
}
export function fishTick(g, dt, rng = Math.random) {
  g.t += dt;
  if (g.phase === "wait" && g.t >= g.biteAt) { g.phase = "bite"; g.t = 0; g.fish = pickFish(g.spot, rng); }
  else if (g.phase === "bite" && g.t > BITE_WINDOW) g.phase = "missed";
  else if (g.phase === "reel") {
    g.reel -= FISH[g.fish].pull * dt;
    if (g.reel <= 0) { g.reel = 0; g.phase = "escaped"; }
  }
  return g;
}
/* A tap: too soon (scared it off), a strike on a bite, or a turn of the reel. */
export function fishTap(g) {
  if (g.phase === "wait") g.phase = "early";
  else if (g.phase === "bite") { g.phase = "reel"; g.reel = 0.35; }
  else if (g.phase === "reel") {
    g.reel += REEL_TAP;
    if (g.reel >= 1) { g.reel = 1; g.phase = "caught"; }
  }
  return g.phase;
}
export const fishLeft = hero => Math.max(0, FISH_PER_REST - (hero.fishCaught || 0));
/* Puts a caught fish in your pack. */
export function landFish(hero, id) {
  hero.fishCaught = (hero.fishCaught || 0) + 1;
  const fish = makeItem(id);
  hero.inventory.push(fish);
  return fish;
}

// ---------------------------------------------------------------- Prizes
// The first win of each game, once: a trinket for you, or Megan's new bow.
export const PRIZES = {
  knucklebones: { flag: "wonKnucklebones", item: "luckyDie" },
  armWrestle: { flag: "wonArmWrestle", item: "oswinBelt" },
  archery: { flag: "wonArchery", item: "willowBow" },
};

/* A win: the prize the first time (returns the item), nothing after. Megan's bow goes straight to her, wherever she is. */
export function winPrize(hero, flags, game) {
  const p = PRIZES[game];
  if (flags[p.flag]) return null;
  flags[p.flag] = true;
  const item = makeItem(p.item);
  if (game === "archery") {
    item.upgrade = 1;
    const megan = hero.companion?.id === "megan" ? hero.companion : hero.roster?.find(r => r.id === "megan");
    if (megan) {
      const old = megan.gear?.bow;
      megan.gear = { ...megan.gear, bow: item };
      if (old) hero.inventory.push(old);
      return item;
    }
  }
  hero.inventory.push(item);
  return item;
}
