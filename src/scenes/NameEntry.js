// The name screen: tap letters (or type, with a keyboard) to name your hero, then DONE. Leaving it empty keeps "Hero".
// data.mode "new" comes from the title screen's NEW GAME and starts the game; "rename" comes from the bag and goes
// back to it. BACK leaves without changing anything.
import { WIDTH, COLORS } from "../config.js";
import { state, newGame, autosave } from "../state/game.js";
import { deleteSave } from "../state/save.js";
import { cleanName, callName, MAX_NAME, DEFAULT_NAME } from "../story/hero.js";
import { text, panel, button, uiCamera } from "../ui/widgets.js";
import { heroFrame } from "../art/pixels.js";
import { sfx } from "../audio/sound.js";

const ROWS = ["ABCDEFGHI", "JKLMNOPQR", "STUVWXYZ-"];
const KEY_W = 36, KEY_H = 24, GAP = 4;

export class NameEntry extends Phaser.Scene {
  constructor() { super("NameEntry"); }

  create(data = {}) {
    uiCamera(this);
    this.mode = data.mode || "new";
    this.name = this.mode === "rename" ? callName(state.hero).toUpperCase() : "";
    this.add.rectangle(0, 0, WIDTH, 270, COLORS.bg).setOrigin(0);
    text(this, WIDTH / 2, 12, this.mode === "rename" ? "A NEW NAME?" : "WHAT IS YOUR NAME?", { color: COLORS.gold }).setOrigin(0.5, 0);
    this.add.image(120, 64, "hero", heroFrame("down"));
    panel(this, 150, 38, 190, 28);
    this.shown = text(this, 245, 52, "", { fontSize: "16px" }).setOrigin(0.5);

    const x0 = WIDTH / 2 - (ROWS[0].length * (KEY_W + GAP) - GAP) / 2 + KEY_W / 2;
    ROWS.forEach((row, r) => [...row].forEach((ch, c) => {
      button(this, x0 + c * (KEY_W + GAP), 92 + r * (KEY_H + GAP), KEY_W, KEY_H, ch, () => this.add_(ch));
    }));
    button(this, WIDTH / 2 - 80, 176, 116, KEY_H, "SPACE", () => this.add_(" "));
    button(this, WIDTH / 2 + 80, 176, 116, KEY_H, "DEL", () => this.del());
    button(this, WIDTH / 2 - 80, 212, 116, KEY_H, "BACK", () => this.back());
    this.doneButton = button(this, WIDTH / 2 + 80, 212, 116, KEY_H, "DONE", () => this.done());
    text(this, WIDTH / 2, 236, `Up to ${MAX_NAME} letters. Leave it empty to be called ${DEFAULT_NAME}.`, { color: COLORS.dim }).setOrigin(0.5, 0);

    this.input.keyboard.on("keydown", e => {
      if (e.key === "Enter") this.done();
      else if (e.key === "Escape") this.back();
      else if (e.key === "Backspace") this.del();
      else if (/^[a-zA-Z '-]$/.test(e.key)) this.add_(e.key.toUpperCase());
    });
    this.blink = true;
    this.time.addEvent({ delay: 450, loop: true, callback: () => { this.blink = !this.blink; this.show(); } });
    this.show();
  }

  show() {
    const cursor = this.name.length < MAX_NAME && this.blink ? "_" : " ";
    this.shown.setText(this.name + cursor);
  }

  add_(ch) {
    if (this.name.length >= MAX_NAME || (ch === " " && (!this.name || this.name.endsWith(" ")))) return sfx("back");
    this.name += ch;
    sfx("select");
    this.show();
  }

  del() {
    this.name = this.name.slice(0, -1);
    sfx("back");
    this.show();
  }

  done() {
    const name = cleanName(this.name);
    sfx("select");
    if (this.mode === "rename") {
      state.hero.name = name;
      autosave();
      this.scene.stop();
      this.scene.resume("Inventory");
      return;
    }
    deleteSave();
    newGame(name);
    autosave();
    this.cameras.main.fadeOut(200);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("World"));
  }

  back() {
    sfx("back");
    if (this.mode === "rename") { this.scene.stop(); this.scene.resume("Inventory"); }
    else this.scene.start("Title");
  }
}
