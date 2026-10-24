// The credits, after the ending (Act 4): the cast rolls up the screen over the keep's music, and a tap at the end (or
// SKIP) goes back to the world, in the keep, for free play.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state, autosave } from "../state/game.js";
import { creditLines } from "../story/credits.js";
import { text, button, uiCamera } from "../ui/widgets.js";
import { playMusic } from "../audio/sound.js";

const SPEED = 22; // pixels a second

export class Credits extends Phaser.Scene {
  constructor() { super("Credits"); }

  create() {
    uiCamera(this);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000).setOrigin(0);
    playMusic("keep");
    autosave();
    this.roll = this.add.container(0, HEIGHT);
    creditLines(state).forEach((line, i) => {
      const big = /^[A-Z ]+$/.test(line) && line.length > 2;
      this.roll.add(text(this, WIDTH / 2, i * 16, line, { color: big ? COLORS.gold : COLORS.text }).setOrigin(0.5, 0));
    });
    this.length = creditLines(state).length * 16;
    this.done = false;
    button(this, WIDTH - 44, 16, 72, 20, "SKIP", () => this.leave());
  }

  update(_, ms) {
    if (this.done) return;
    this.roll.y -= SPEED * Math.min(ms, 50) / 1000;
    if (this.roll.y < HEIGHT / 2 - this.length) { // the last line's in the middle: wait for a tap
      this.done = true;
      text(this, WIDTH / 2, HEIGHT - 30, "TAP TO CONTINUE", { color: COLORS.dim }).setOrigin(0.5);
      this.input.once("pointerup", () => this.leave());
      this.input.keyboard.once("keydown", () => this.leave());
    }
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start("World");
  }
}
