// The Oakhollow bank, opened over the world. Put gold in or take it out, 10, 50 or all at a time.
// Banked gold is safe: fainting only costs some of the gold you're carrying.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state, FAINT_MAX_LOSS } from "../state/game.js";
import { deposit, withdraw } from "../rules/bank.js";
import { text, panel, button, uiCamera } from "../ui/widgets.js";
import { heroFrame } from "../art/pixels.js";
import { sfx } from "../audio/sound.js";

const AMOUNTS = [10, 50, "all"];
const GREETING = `Welcome to the bank! Gold you leave with me is safe. If you faint out there, you only lose some of what you carry (never more than ${FAINT_MAX_LOSS}).`;

export class Bank extends Phaser.Scene {
  constructor() { super("Bank"); }

  create() {
    uiCamera(this);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    text(this, 10, 9, "BANK", { color: COLORS.gold });
    button(this, WIDTH - 34, 13, 56, 18, "LEAVE", () => this.close());
    this.input.keyboard.on("keydown-ESC", () => this.close());

    panel(this, 6, 30, 468, 46);
    text(this, 18, 40, "CARRYING", { color: COLORS.dim });
    text(this, 258, 40, "IN THE BANK", { color: COLORS.dim });
    this.carried = text(this, 18, 56, "", { color: COLORS.gold });
    this.banked = text(this, 258, 56, "", { color: COLORS.gold });

    panel(this, 6, 82, 468, 110);
    text(this, 18, 92, "PUT IN", { color: COLORS.dim });
    text(this, 18, 142, "TAKE OUT", { color: COLORS.dim });
    const label = a => (a === "all" ? "ALL" : `${a}`);
    this.depositButtons = AMOUNTS.map((a, i) => button(this, 70 + i * 96, 120, 84, 24, label(a), () => this.act(deposit, a, "in")));
    this.withdrawButtons = AMOUNTS.map((a, i) => button(this, 70 + i * 96, 170, 84, 24, label(a), () => this.act(withdraw, a, "out")));

    panel(this, 6, 198, 468, 66);
    this.add.image(28, 230, "hero", heroFrame("down")).setTint(0xe8d27a); // the banker, until they get a sprite of their own
    this.say = text(this, 50, 208, GREETING, { wordWrap: { width: 410 }, lineSpacing: 5 });
    this.refresh();
  }

  refresh() {
    const h = state.hero;
    this.carried.setText(`${h.gold} GOLD`);
    this.banked.setText(`${h.bank || 0} GOLD`);
    for (const b of this.depositButtons) b.setEnabled(h.gold > 0);
    for (const b of this.withdrawButtons) b.setEnabled((h.bank || 0) > 0);
  }

  act(fn, amount, way) {
    const r = fn(state.hero, amount);
    this.say.setText(r.ok ? (way === "in" ? `${r.amount} gold, safe and sound in the vault.` : `Here's ${r.amount} gold. Spend it wisely!`) : r.reason)
      .setColor(r.ok ? COLORS.text : COLORS.bad);
    sfx(r.ok ? "coin" : "back");
    this.refresh();
  }

  close() {
    this.scene.stop();
    this.scene.resume("World");
  }
}
