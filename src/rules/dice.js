// Dice. Every function takes an optional `rng` (a function returning 0 <= n < 1) so tests can use a seeded one.

/* A small seeded random number generator (mulberry32). Same seed, same rolls. */
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollDie(sides, rng = Math.random) {
  return 1 + Math.floor(rng() * sides);
}

/* "2d6+3" -> { count: 2, sides: 6, bonus: 3 }. A plain number like "4" is { count: 0, sides: 0, bonus: 4 }. */
export function parseDice(expr) {
  const text = String(expr).replace(/\s+/g, "").toLowerCase();
  const m = text.match(/^(?:(\d*)d(\d+))?([+-]\d+)?$/);
  if (!m || (!m[2] && !m[3])) {
    if (/^\d+$/.test(text)) return { count: 0, sides: 0, bonus: Number(text) };
    throw new Error(`Bad dice expression: ${expr}`);
  }
  return { count: m[2] ? Number(m[1] || 1) : 0, sides: m[2] ? Number(m[2]) : 0, bonus: m[3] ? Number(m[3]) : 0 };
}

/* Rolls an expression. `crit` doubles the number of dice (not the bonus), as 5e does on a critical hit. */
export function roll(expr, rng = Math.random, { crit = false, extraBonus = 0 } = {}) {
  const { count, sides, bonus } = parseDice(expr);
  const n = crit ? count * 2 : count;
  const rolls = [];
  for (let i = 0; i < n; i++) rolls.push(rollDie(sides, rng));
  const total = rolls.reduce((s, r) => s + r, 0) + bonus + extraBonus;
  return { expr: String(expr), rolls, bonus: bonus + extraBonus, total };
}

/* One d20 roll. Advantage keeps the higher of two, disadvantage the lower; having both cancels out. */
export function d20({ advantage = false, disadvantage = false } = {}, rng = Math.random) {
  const twice = advantage !== disadvantage;
  const rolls = twice ? [rollDie(20, rng), rollDie(20, rng)] : [rollDie(20, rng)];
  const natural = !twice ? rolls[0] : advantage ? Math.max(...rolls) : Math.min(...rolls);
  return { rolls, natural };
}
