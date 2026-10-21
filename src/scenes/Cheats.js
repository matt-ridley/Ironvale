// The cheats screen, from the title screen's CHEATS: tap letters (or type) to enter a code, then ENTER. A right code
// asks how much XP or gold to add (digits), then ADD adds it to your saved hero. BACK goes back to the title screen.
// data.step is "code", "amount" (with data.cheat) or "done" (with data.note); each step restarts the scene.
import { WIDTH, COLORS } from "../config.js";
import { state, autosave } from "../state/game.js";
import { cheatFor, applyCheat, MAX_CHEAT_AMOUNT } from "../rules/cheats.js";
import { text, panel, button, uiCamera } from "../ui/widgets.js";
import { sfx } from "../audio/sound.js";

const LETTERS = ["ABCDEFGHI", "JKLMNOPQR", "STUVWXYZ"];
const DIGITS = "1234567890";
const KEY_W = 36, KEY_H = 24, GAP = 4;
const MAX_CODE = 22;
const MAX_DIGITS = String(MAX_CHEAT_AMOUNT).length;

export class Cheats extends Phaser.Scene {
  constructor() { super("Cheats"); }

  create(data = {}) {
    uiCamera(this);
    this.step = data.step || "code";
    this.cheat = data.cheat || null;
    this.entry = "";
    this.add.rectangle(0, 0, WIDTH, 270, COLORS.bg).setOrigin(0);
    if (this.step === "done") return this.drawDone(data.note);

    const title = this.step === "code" ? "ENTER A CHEAT CODE" : `HOW MUCH ${this.cheat.label} TO ADD?`;
    text(this, WIDTH / 2, 12, title, { color: COLORS.gold }).setOrigin(0.5, 0);
    panel(this, 60, 34, 360, 28);
    this.shown = text(this, WIDTH / 2, 48, "", { fontSize: "16px" }).setOrigin(0.5);
    this.msg = text(this, WIDTH / 2, 68, "", { color: COLORS.bad }).setOrigin(0.5, 0);

    const keys = this.step === "code" ? LETTERS : [DIGITS];
    const x0 = WIDTH / 2 - (keys[0].length * (KEY_W + GAP) - GAP) / 2 + KEY_W / 2;
    keys.forEach((row, r) => [...row].forEach((ch, c) => {
      button(this, x0 + c * (KEY_W + GAP), 92 + r * (KEY_H + GAP), KEY_W, KEY_H, ch, () => this.add_(ch));
    }));
    button(this, WIDTH / 2, 176, 116, KEY_H, "DEL", () => this.del());
    button(this, WIDTH / 2 - 80, 212, 116, KEY_H, "BACK", () => this.back());
    button(this, WIDTH / 2 + 80, 212, 116, KEY_H, this.step === "code" ? "ENTER" : "ADD", () => this.done());

    this.input.keyboard.on("keydown", e => {
      if (e.key === "Enter") this.done();
      else if (e.key === "Escape") this.back();
      else if (e.key === "Backspace") this.del();
      else if (this.step === "code" ? /^[a-zA-Z]$/.test(e.key) : /^[0-9]$/.test(e.key)) this.add_(e.key.toUpperCase());
    });
    this.blink = true;
    this.time.addEvent({ delay: 450, loop: true, callback: () => { this.blink = !this.blink; this.show(); } });
    this.show();
  }

  get maxLength() { return this.step === "code" ? MAX_CODE : MAX_DIGITS; }

  show() {
    const cursor = this.entry.length < this.maxLength && this.blink ? "_" : " ";
    this.shown.setText(this.entry + cursor);
  }

  add_(ch) {
    if (this.entry.length >= this.maxLength || (ch === "0" && !this.entry)) return sfx("back");
    this.entry += ch;
    this.msg.setText("");
    sfx("select");
    this.show();
  }

  del() {
    this.entry = this.entry.slice(0, -1);
    sfx("back");
    this.show();
  }

  done() {
    if (this.step === "code") {
      const cheat = cheatFor(this.entry);
      if (!cheat) return this.fail("That is not a cheat code.");
      sfx("select");
      return this.scene.restart({ step: "amount", cheat });
    }
    const before = state.hero.level;
    const r = applyCheat(state.hero, this.cheat.kind, Number(this.entry));
    if (!r.ok) return this.fail(r.reason);
    autosave();
    sfx("select");
    const levelled = state.hero.level > before ? `\nYou are now level ${state.hero.level}!` : "";
    this.scene.restart({ step: "done", note: `+${r.amount} ${this.cheat.label} added.${levelled}` });
  }

  fail(reason) {
    sfx("back");
    this.entry = "";
    this.msg.setText(reason);
    this.show();
  }

  drawDone(note) {
    text(this, WIDTH / 2, 90, note, { color: COLORS.good, align: "center", lineSpacing: 6 }).setOrigin(0.5, 0);
    const ok = button(this, WIDTH / 2, 160, 116, KEY_H, "OK", () => this.scene.start("Title"));
    this.input.keyboard.on("keydown-ENTER", () => ok.bg.emit("pointerup"));
  }

  back() {
    sfx("back");
    if (this.step === "amount") this.scene.restart({ step: "code" });
    else this.scene.start("Title");
  }
}
