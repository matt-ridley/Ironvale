// Ability checks and saving throws: d20 + ability modifier (+ proficiency if trained) against a DC.
// Unlike attacks, a natural 20 or 1 has no special effect on a check (as in 5e).
import { d20 } from "./dice.js";
import { mod, proficiencyBonus, SAVE_PROFICIENCIES } from "./character.js";

// Rough difficulty names, for writing events.
export const DC = { veryEasy: 5, easy: 10, medium: 15, hard: 20, veryHard: 25 };

export function abilityCheck(char, ability, dc, rng = Math.random, { proficient = false, advantage = false, disadvantage = false } = {}) {
  const { rolls, natural } = d20({ advantage, disadvantage }, rng);
  const bonus = mod(char, ability) + (proficient ? proficiencyBonus(char.level) : 0);
  const total = natural + bonus;
  return { ability, dc, rolls, natural, bonus, total, success: total >= dc };
}

/* A saving throw: like a check, but the hero adds their proficiency bonus to the saves their class is trained in (a
   fighter's STR and CON). Monsters' spells and attacks (a ghoul's paralysis, say) call for these. */
export function savingThrow(char, ability, dc, rng = Math.random, { advantage = false, disadvantage = false } = {}) {
  return { ...abilityCheck(char, ability, dc, rng, { proficient: SAVE_PROFICIENCIES.includes(ability), advantage, disadvantage }), save: true };
}

/* "STR check (DC 12): rolled 14 + 2 = 16. Success." (or "CON save ...") */
export function describeCheck(r) {
  const sign = r.bonus < 0 ? "-" : "+";
  const rolled = r.rolls.length > 1 ? `${r.rolls.join(" / ")} -> ${r.natural}` : `${r.natural}`;
  return `${r.ability} ${r.save ? "save" : "check"} (DC ${r.dc}): rolled ${rolled} ${sign} ${Math.abs(r.bonus)} = ${r.total}. ${r.success ? "Success" : "Failure"}.`;
}
