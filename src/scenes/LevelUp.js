// The level-up screen, opened over the world when you have an ability score increase to spend (levels 4, 6 and 8,
// or a hero saved at level 4 or higher before 0.19.0). Pick STR, DEX or CON to raise by 2; each shows what it would
// change. It can't be closed without picking, and opens again while there are more to spend.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state, autosave } from "../state/game.js";
import { ABILITIES, increaseAbility, previewIncrease } from "../rules/character.js";
import { text, panel, button, uiCamera } from "../ui/widgets.js";
import { heroFrame } from "../art/pixels.js";
import { sfx } from "../audio/sound.js";

const ABOUT = {
  STR: "Hit harder with most weapons.",
  DEX: "AC in light armour, going first, fleeing.",
  CON: "More HP, now and at every level.",
};

/* What a preview changes, in a few words. */
function gains(p) {
  const sign = n => (n > 0 ? `+${n}` : `${n}`);
  const parts = [p.hit && `${sign(p.hit)} to hit`, p.damage && `${sign(p.damage)} damage`, p.ac && `${sign(p.ac)} AC`,
    p.hp && `${sign(p.hp)} max HP`, p.init && `${sign(p.init)} to go first and to flee`].filter(Boolean);
  return parts.length ? parts.join(", ") : "Nothing you'd notice in a fight yet.";
}

export class LevelUp extends Phaser.Scene {
  constructor() { super("LevelUp"); }

  create() {
    uiCamera(this);
    const h = state.hero;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    text(this, 10, 9, "LEVEL UP!", { color: COLORS.gold });
    this.add.image(26, 52, "hero", heroFrame("down"));
    text(this, 48, 32, `Level ${h.level}: raise one ability score by 2.${h.asi > 1 ? ` (${h.asi} to pick)` : ""}`, { wordWrap: { width: 420 } });
    text(this, 48, 48, `STR ${h.abilities.STR}   DEX ${h.abilities.DEX}   CON ${h.abilities.CON}`, { color: COLORS.dim });

    ABILITIES.forEach((ab, i) => {
      const y = 72 + i * 62, p = previewIncrease(h, ab);
      panel(this, 6, y, 468, 56);
      text(this, 16, y + 8, p.ok ? `${ab} ${p.from} > ${p.to}` : `${ab} ${h.abilities[ab]}`, { color: COLORS.gold });
      text(this, 16, y + 22, ABOUT[ab], { color: COLORS.dim, wordWrap: { width: 340 } });
      text(this, 16, y + 40, p.ok ? gains(p) : p.reason, { color: p.ok ? COLORS.good : COLORS.bad, wordWrap: { width: 340 } });
      button(this, 420, y + 28, 92, 24, `RAISE ${ab}`, () => this.pick(ab)).setEnabled(p.ok);
    });
  }

  pick(ability) {
    const r = increaseAbility(state.hero, ability);
    if (!r.ok) { sfx("back"); return; }
    sfx("heal");
    autosave();
    this.scene.stop();
    this.scene.resume("World"); // which opens this screen again if there's another to pick
  }
}
