// The Oath screen, at the Door at the end of Act 3: pick one of the three Oaths on the left to read what it means on
// the right, with what the companion with you thinks underneath. SWEAR, then tap again to be sure: it's for good. Then
// the world plays what happens next (the afterOath script).
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state, autosave } from "../state/game.js";
import { OATHS, OATH_IDS, OATH_OPINIONS, NO_COMPANION_OPINION, swearOath } from "../rules/oaths.js";
import { learnRune } from "../rules/character.js";
import { text, panel, button, uiCamera } from "../ui/widgets.js";
import { paintHero } from "../art/pixels.js";
import { sfx, playJingle } from "../audio/sound.js";

const SIGNATURE_RUNE = { storm: "chainLightning", dawn: "dawnstrike" }; // (Iron's Unbroken needs no button)

export class Oath extends Phaser.Scene {
  constructor() { super("Oath"); }

  create() {
    uiCamera(this);
    this.choice = null;
    this.confirming = false;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    text(this, 10, 9, "THE OATH", { color: COLORS.gold });
    text(this, WIDTH - 10, 9, "It's for good.", { color: COLORS.dim }).setOrigin(1, 0);

    panel(this, 6, 26, 118, 176);
    this.tabs = Object.fromEntries(OATH_IDS.map((id, i) => [id, button(this, 65, 50 + i * 40, 104, 30, OATHS[id].title.toUpperCase().replace("SWORN OF ", ""), () => this.pick(id))]));
    panel(this, 130, 26, 344, 176);
    this.name = text(this, 140, 34, "", { color: COLORS.gold });
    this.body = text(this, 140, 50, "", { wordWrap: { width: 326 }, lineSpacing: 4 });

    panel(this, 6, 206, 468, 58);
    const c = state.hero.companion;
    text(this, 14, 214, OATH_OPINIONS[c?.id] || NO_COMPANION_OPINION, { color: COLORS.dim, wordWrap: { width: 330 }, lineSpacing: 4 });
    this.swear = button(this, 418, 235, 96, 26, "SWEAR", () => this.doSwear());
    this.swear.setEnabled(false);
    this.body.setText("Colleen holds the crack shut with both hands. \"Choose,\" she says. \"Quickly.\"\n\nPick an Oath on the left to read it.");
  }

  pick(id) {
    sfx("select");
    this.choice = id;
    this.confirming = false;
    for (const [k, b] of Object.entries(this.tabs)) b.setActive(k === id);
    const o = OATHS[id];
    this.name.setText(o.name.toUpperCase());
    this.body.setText(`"${o.words}"\n\n${o.style}\n${o.signature}\n${o.always}\n${o.companion}`);
    this.swear.setEnabled(true).setLabel("SWEAR");
  }

  doSwear() {
    if (!this.choice) return;
    if (!this.confirming) { // a second tap, to be sure
      this.confirming = true;
      sfx("select");
      this.swear.setLabel("SURE? TAP");
      return;
    }
    const r = swearOath(state.hero, state.flags, this.choice);
    if (!r.ok) return;
    if (SIGNATURE_RUNE[this.choice]) learnRune(state.hero, SIGNATURE_RUNE[this.choice]);
    paintHero(this, this.choice);
    playJingle("levelUp");
    autosave();
    this.scene.get("World").pendingScript = "afterOath";
    this.scene.stop();
    this.scene.resume("World");
  }
}
