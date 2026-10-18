// The talking box, opened over the world. Shows a conversation from story/scripts.js one node at a time.
// Tap a choice, or use up/down and Enter (number keys work too). When the conversation ends it either goes
// back to the world or, if the script asked for one, starts a battle.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { SCRIPTS } from "../story/scripts.js";
import { startConversation, view, choose, takeEvents } from "../story/dialogue.js";
import { text, panel, uiCamera } from "../ui/widgets.js";
import { sfx } from "../audio/sound.js";

const BOX_BOTTOM = HEIGHT - 6; // the box grows upwards from here to fit what it says
const ROW_H = 16;

export class Dialogue extends Phaser.Scene {
  constructor() { super("Dialogue"); }

  /* data: { script: name in SCRIPTS, object: the map object being talked to, if any } */
  create(data) {
    uiCamera(this);
    this.convo = startConversation(SCRIPTS[data.script], state, { object: data.object || null });
    this.events_ = [];
    this.done = false; // Phaser reuses this scene object, so reset it every time
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.35).setOrigin(0);
    // With a single option ("Continue" or "Close"), tapping anywhere on the box picks it; easier on a phone.
    this.box = panel(this, 6, 0, WIDTH - 12, 10).setInteractive()
      .on("pointerup", () => { if (this.rows.length === 1) this.pick(0); });
    this.speaker = text(this, 14, 0, "", { color: COLORS.gold });
    this.body = text(this, 14, 0, "", { wordWrap: { width: WIDTH - 32 }, lineSpacing: 4 });
    this.rows = [];
    this.selected = 0;

    const kb = this.input.keyboard;
    kb.on("keydown-UP", () => this.highlight(this.selected - 1));
    kb.on("keydown-W", () => this.highlight(this.selected - 1));
    kb.on("keydown-DOWN", () => this.highlight(this.selected + 1));
    kb.on("keydown-S", () => this.highlight(this.selected + 1));
    kb.on("keydown-ENTER", () => this.pick(this.selected));
    kb.on("keydown-SPACE", () => this.pick(this.selected));
    kb.on("keydown", e => { const n = Number(e.key); if (n >= 1 && n <= this.rows.length) this.pick(n - 1); });

    this.show();
  }

  show() {
    const v = view(this.convo);
    if (!v) return this.finish();
    for (const r of this.rows) { r.bg.destroy(); r.label.destroy(); }
    this.speaker.setText(v.speaker);
    this.body.setText(v.text);
    // Size the box to the text and choices, sitting on the bottom of the screen.
    const height = (v.speaker ? 22 : 10) + this.body.height + 8 + v.choices.length * ROW_H + 6;
    const boxY = BOX_BOTTOM - height;
    this.box.setY(boxY).setSize(WIDTH - 12, height);
    this.box.input.hitArea.setSize(WIDTH - 12, height);
    this.speaker.setY(boxY + 7);
    this.body.setY(boxY + (v.speaker ? 22 : 10));
    const top = this.body.y + this.body.height + 8;
    this.rows = v.choices.map((c, i) => {
      const y = top + i * ROW_H;
      const bg = this.add.rectangle(10, y, WIDTH - 20, ROW_H - 2, COLORS.panelEdge).setOrigin(0).setAlpha(0).setInteractive({ useHandCursor: true });
      const label = text(this, 18, y + 3, `${v.choices.length > 1 ? `${i + 1}. ` : ""}${c.label}`, { color: COLORS.text });
      bg.on("pointerover", () => this.highlight(i));
      bg.on("pointerup", () => this.pick(i));
      return { bg, label };
    });
    this.highlight(0);
  }

  highlight(i) {
    if (!this.rows.length) return;
    this.selected = (i + this.rows.length) % this.rows.length;
    this.rows.forEach((r, j) => {
      r.bg.setAlpha(j === this.selected ? 1 : 0);
      r.label.setColor(j === this.selected ? COLORS.gold : COLORS.text);
    });
  }

  pick(i) {
    if (!this.rows[i] || this.done) return;
    sfx("select");
    choose(this.convo, i);
    this.events_.push(...takeEvents(this.convo));
    this.show();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    const battle = this.events_.find(e => e.type === "battle");
    if (battle) {
      this.scene.stop("World");
      this.scene.start("Battle", battle);
    } else {
      this.scene.stop();
      this.scene.resume("World");
    }
  }
}
