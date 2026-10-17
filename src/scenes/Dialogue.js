// The talking box, opened over the world. Shows a conversation from story/scripts.js one node at a time.
// Tap a choice, or use up/down and Enter (number keys work too). When the conversation ends it either goes
// back to the world or, if the script asked for one, starts a battle.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { SCRIPTS } from "../story/scripts.js";
import { startConversation, view, choose, takeEvents } from "../story/dialogue.js";
import { text, panel } from "../ui/widgets.js";

const BOX_Y = 132;
const ROW_H = 16;

export class Dialogue extends Phaser.Scene {
  constructor() { super("Dialogue"); }

  /* data: { script: name in SCRIPTS, object: the map object being talked to, if any } */
  create(data) {
    this.convo = startConversation(SCRIPTS[data.script], state, { object: data.object || null });
    this.events_ = [];
    this.done = false; // Phaser reuses this scene object, so reset it every time
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.35).setOrigin(0);
    panel(this, 6, BOX_Y, WIDTH - 12, HEIGHT - BOX_Y - 6);
    this.speaker = text(this, 14, BOX_Y + 7, "", { color: COLORS.gold });
    this.body = text(this, 14, BOX_Y + 22, "", { wordWrap: { width: WIDTH - 32 }, lineSpacing: 4 });
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
    this.body.setY(BOX_Y + (v.speaker ? 22 : 10)).setText(v.text);
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
