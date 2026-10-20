// The quest log, opened over the world (the QUESTS button or Q), with two tabs (tap them, or left/right):
// - QUESTS: quests you know about on the left, unfinished ones first; tap one (or use up/down) to see what it's
//   about, its steps and its reward on the right. Done steps are ticked and the next step to do is in gold.
// - BESTIARY: every monster in the game. Ones you haven't met are ???; meet one and its picture and story show;
//   beat one and you learn its stats.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { questLog } from "../story/quests.js";
import { bestiaryEntries } from "../rules/bestiary.js";
import { text, panel, button, ListView, uiCamera } from "../ui/widgets.js";
import { sfx } from "../audio/sound.js";

const DETAIL_X = 218, DETAIL_W = 248;

export class Quests extends Phaser.Scene {
  constructor() { super("Quests"); }

  /* data.tab: "quests" (the default) or "bestiary". */
  create(data = {}) {
    uiCamera(this);
    this.tab = data.tab === "bestiary" ? "bestiary" : "quests";
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    const tabs = {
      quests: button(this, 42, 13, 72, 18, "QUESTS", () => this.switchTo("quests")),
      bestiary: button(this, 126, 13, 88, 18, "BESTIARY", () => this.switchTo("bestiary")),
    };
    tabs[this.tab].setActive(true).text.setColor(COLORS.gold);
    button(this, WIDTH - 34, 13, 56, 18, "CLOSE", () => this.close());
    const kb = this.input.keyboard;
    for (const k of ["ESC", "Q"]) kb.on(`keydown-${k}`, () => this.close());
    kb.on("keydown-LEFT", () => this.switchTo("quests"));
    kb.on("keydown-RIGHT", () => this.switchTo("bestiary"));
    const rows = this.tab === "quests"
      ? questLog(state.flags).map(q => ({ label: q.title, right: q.done ? "DONE" : "", color: q.done ? COLORS.dim : COLORS.text, quest: q }))
      : bestiaryEntries(state.bestiary).map(m => ({ label: m.known ? m.name : "???", right: m.beaten ? `x${m.beaten}` : "", color: m.known ? COLORS.text : COLORS.dim, monster: m }));
    for (const k of ["UP", "W"]) kb.on(`keydown-${k}`, () => this.list.select(Math.max(this.list.selected - 1, 0)));
    for (const k of ["DOWN", "S"]) kb.on(`keydown-${k}`, () => this.list.select(Math.min(this.list.selected + 1, rows.length - 1)));

    panel(this, 6, 26, 200, 238);
    this.list = new ListView(this, 10, 32, 192, 13, row => (row.quest ? this.show(row.quest) : this.showMonster(row.monster)));
    this.list.setItems(rows, false);

    panel(this, 212, 26, 262, 238);
    this.detail = [];
    this.quiet = true; // no click for the first row, picked for you
    this.list.select(Math.max(0, rows.findIndex(r => r.quest || r.monster.known))); // in the bestiary, the first one you've met
    this.quiet = false;
  }

  switchTo(tab) {
    if (tab === this.tab) return;
    sfx("select");
    this.scene.restart({ tab });
  }

  /* Starts the right-hand panel afresh. line(str, colour, gap, x) adds a line under the last one. */
  clearDetail() {
    if (!this.quiet) sfx("select");
    for (const t of this.detail) t.destroy();
    this.detail = [];
    this.y = 34;
  }

  line(str, color = COLORS.text, gap = 6, x = DETAIL_X, width = DETAIL_W - (x - DETAIL_X)) {
    const t = text(this, x, this.y, str, { color, wordWrap: { width }, lineSpacing: 4 });
    this.detail.push(t);
    this.y += t.height + gap;
    return t;
  }

  /* One monster: its picture (once you've met it), story and where it lives, and its stats (once you've beaten one). */
  showMonster(m) {
    this.clearDetail();
    if (!m.known) {
      this.line("???", COLORS.gold, 10);
      this.line("You haven't met this one yet.", COLORS.dim);
      return;
    }
    const pic = this.add.image(WIDTH - 40, 100, m.id).setOrigin(0.5, 1).setFlipX(true);
    this.detail.push(pic);
    const narrow = DETAIL_W - 84; // beside the picture
    this.line(m.name.toUpperCase(), COLORS.gold, 6, DETAIL_X, narrow);
    this.line(`MET ${m.seen}   BEATEN ${m.beaten}`, COLORS.dim, 6, DETAIL_X, narrow);
    this.line(`Found in: ${m.where}`, COLORS.dim, 10, DETAIL_X, narrow);
    this.y = Math.max(this.y, 108);
    this.line(m.about, COLORS.text, 12);
    if (!m.studied) return this.line("Beat one to learn its stats.", COLORS.dim);
    for (const s of m.stats) this.line(s, COLORS.text, 5);
  }

  /* One quest, each line under the last. */
  show(q) {
    this.clearDetail();
    this.line(q.title.toUpperCase(), COLORS.gold, 4);
    this.line(`${q.kind === "main" ? "MAIN QUEST" : "SIDE QUEST"}${q.done ? " - DONE" : ""}`, q.done ? COLORS.good : COLORS.dim, 10);
    this.line(q.about, COLORS.text, 12);
    for (const st of q.steps) {
      const mark = text(this, DETAIL_X, this.y, st.done ? "[X]" : "[ ]", { color: st.done ? COLORS.good : COLORS.dim });
      this.detail.push(mark);
      this.line(st.text, st.done ? COLORS.dim : st.current ? COLORS.gold : COLORS.text, 7, DETAIL_X + 30);
    }
    if (q.reward) this.line(`REWARD: ${q.reward}`, COLORS.dim, 0);
  }

  close() {
    this.scene.stop();
    this.scene.resume("World");
  }
}
