// Friends who join your party and fight beside you. A companion acts on their own turn (attacking the monster you
// last aimed at), grows with your level, and is carried on the hero as { id, hurt } (damage taken, so a rest only
// has to set it to 0). If a companion falls in a fight they sit out the rest of it and get up afterwards.
import { proficiencyBonus } from "./character.js";

export const COMPANIONS = {
  // Wren, a young ranger from Willowmere: light armour, a shortbow and quick hands.
  wren: { name: "Wren", ac: 13, dexMod: 2, hpBase: 8, hpPerLevel: 5, attack: { name: "Shortbow", ability: 2, damage: "1d6" } },
};

export const companionMaxHp = (id, level) => COMPANIONS[id].hpBase + COMPANIONS[id].hpPerLevel * (level - 1);

/* The companion's fighting stats at the hero's level, as the battle uses them, or null with no companion. */
export function companionStats(hero) {
  const c = hero.companion, base = c && COMPANIONS[c.id];
  if (!base) return null;
  const maxHp = companionMaxHp(c.id, hero.level);
  return {
    id: c.id, name: base.name, ac: base.ac, dexMod: base.dexMod, maxHp,
    hp: Math.max(1, maxHp - (c.hurt || 0)),
    attack: { name: base.attack.name, bonus: base.attack.ability + proficiencyBonus(hero.level), damage: base.attack.damage, damageBonus: base.attack.ability },
  };
}

export function joinParty(hero, id) {
  hero.companion = { id, hurt: 0 };
}

/* After a fight: keep the companion's wounds (at least 1 HP left; a fallen friend gets back up). */
export function afterBattle(hero, ally) {
  if (hero.companion && ally) hero.companion.hurt = ally.maxHp - Math.max(1, ally.hp);
}
