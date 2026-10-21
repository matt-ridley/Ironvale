// Paying quest rewards in conversations: gold and XP, and the "(+150 gold, +1500 XP, level 6!)" note that follows.
// Shared by scripts.js and act3.js. No Phaser here.
import { gainXp } from "../rules/character.js";

/* Pays a quest reward and remembers any new level for the line that says so. */
export function pay(s, ctx, reward) {
  const before = s.hero.level;
  s.hero.gold += reward.gold;
  gainXp(s.hero, reward.xp, ctx.rng);
  ctx.remember("newLevel", s.hero.level > before ? s.hero.level : null);
}
export const paid = (ctx, reward) => `(+${reward.gold} gold, +${reward.xp} XP${ctx.recall("newLevel") ? `, level ${ctx.recall("newLevel")}!` : ""})`;
