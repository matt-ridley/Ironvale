// The quest log, opened over the world (the QUESTS button or Q). Quests you know about are listed on the left,
// unfinished ones first; tap one (or use up/down) to see what it's about, its steps and its reward on the right.
// Done steps are ticked and the next step to do is in gold.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { questLog } from "../story/quests.js";
import { text, panel, button, ListView, uiCamera } from "../ui/widgets.js";
import { sfx } from "../audio/sound.js";

const DETAIL_X = 218, DETAIL_W = 248;

export class Quests extends Phaser.Scene {
  constructor() { super("Quests"); }

  create() {
    uiCamera(this);
    this.log = questLog(state.flags);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    text(this, 10, 9, "QUESTS", { color: COLORS.gold });
    button(this, WIDTH - 34, 13, 56, 18, "CLOSE", () => this.close());
    const kb = this.input.keyboard;
    for (const k of ["ESC", "Q"]) kb.on(`keydown-${k}`, () => this.close());
    for (const k of ["UP", "W"]) kb.on(`keydown-${k}`, () => this.list.select(Math.max(this.list.selected - 1, 0)));
    for (const k of ["DOWN", "S"]) kb.on(`keydown-${k}`, () => this.list.select(Math.min(this.list.selected + 1, this.log.length - 1)));

    panel(this, 6, 26, 200, 238);
    this.list = new ListView(this, 10, 32, 192, 13, row => this.show(row.quest));
    this.list.setItems(this.log.map(q => ({ label: q.title, right: q.done ? "DONE" : "", color: q.done ? COLORS.dim : COLORS.text, quest: q })), false);

    panel(this, 212, 26, 262, 238);
    this.detail = [];
    this.list.select(0);
  }

  /* Fills the right-hand panel with one quest, each line under the last. */
  show(q) {
    sfx("select");
    for (const t of this.detail) t.destroy();
    let y = 34;
    const line = (str, color = COLORS.text, gap = 6, x = DETAIL_X) => {
      const t = text(this, x, y, str, { color, wordWrap: { width: DETAIL_W - (x - DETAIL_X) }, lineSpacing: 4 });
      this.detail.push(t);
      y += t.height + gap;
      return t;
    };
    line(q.title.toUpperCase(), COLORS.gold, 4);
    line(`${q.kind === "main" ? "MAIN QUEST" : "SIDE QUEST"}${q.done ? " - DONE" : ""}`, q.done ? COLORS.good : COLORS.dim, 10);
    line(q.about, COLORS.text, 12);
    for (const st of q.steps) {
      const mark = text(this, DETAIL_X, y, st.done ? "[X]" : "[ ]", { color: st.done ? COLORS.good : COLORS.dim });
      this.detail.push(mark);
      line(st.text, st.done ? COLORS.dim : st.current ? COLORS.gold : COLORS.text, 7, DETAIL_X + 30);
    }
    if (q.reward) line(`REWARD: ${q.reward}`, COLORS.dim, 0);
  }

  close() {
    this.scene.stop();
    this.scene.resume("World");
  }
}
