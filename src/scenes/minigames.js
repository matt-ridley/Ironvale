// The minigame screens, opened over the world from a conversation (story/minigames.js): knucklebones, arm wrestling,
// the archery contest and fishing. Each is one big tap target (the whole screen, or a column of dice); the rules and the
// prizes are in rules/minigames.js. LEAVE (or Esc) goes back to the world.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state, autosave } from "../state/game.js";
import { text, panel, button, uiCamera, trackTaps, freshTap } from "../ui/widgets.js";
import { heroFrame } from "../art/pixels.js";
import { sfx } from "../audio/sound.js";
import { itemName } from "../rules/items.js";
import {
  KB_STAKE, kbNew, kbRoll, kbPlace, kbBestColumn, kbColumnScore, kbScores, kbWinner,
  awNew, awTick, awTap, AW_ZONE,
  ARROWS, MEGAN_SCORE, MATTHEW_SCORE, RINGS, archNew, archAim, archTick, archShoot, archTotal, archDone,
  fishNew, fishTick, fishTap, fishLeft, landFish, FISHING_SPOTS,
  winPrize,
} from "../rules/minigames.js";

const GOOD = 0x7bc96f, BAD = 0xd0684e, GOLD = 0xe8b923, INK = 0x2b1d2e, STRAW = 0xd9c27a, WOOD = 0x6b4226;

/* What all four share: the backdrop, a title, LEAVE, a message line, and taps anywhere (minus the buttons). */
class Minigame extends Phaser.Scene {
  setup(title) {
    uiCamera(this);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    trackTaps(this);
    // A tap anywhere (buttons are added on top, and catch their own). `tap` gets where, in screen units.
    this.pad = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0).setOrigin(0).setInteractive();
    this.pad.on("pointerdown", p => { if (freshTap(this, p)) this.tap(this.cameras.main.getWorldPoint(p.x, p.y)); });
    text(this, 10, 9, title, { color: COLORS.gold });
    this.gold = text(this, WIDTH - 72, 9, "", { color: COLORS.gold }).setOrigin(1, 0);
    button(this, WIDTH - 34, 13, 56, 18, "LEAVE", () => this.close());
    this.input.keyboard.on("keydown-ESC", () => this.close());
    this.input.keyboard.on("keydown-SPACE", () => this.tap());
    this.input.keyboard.on("keydown-ENTER", () => this.tap());
    this.showGold();
  }
  showGold() { this.gold.setText(`${state.hero.gold} GOLD`); }
  tap() {}
  /* The prize for a first win, as a line to show (or ""). */
  prize(game, who = "") {
    const item = winPrize(state.hero, state.flags, game);
    autosave();
    return item ? ` ${who ? `${who}'s prize` : "Prize"}: ${itemName(item)}!` : "";
  }
  close() {
    autosave();
    this.scene.stop();
    this.scene.resume("World");
  }
}

/* A d6 face: a rounded square with its pips. */
function drawDie(g, x, y, size, value, fill = 0xf5f5f0) {
  g.fillStyle(INK).fillRoundedRect(x - 1, y - 1, size + 2, size + 2, 4);
  g.fillStyle(fill).fillRoundedRect(x, y, size, size, 3);
  const p = size / 4, r = Math.max(1.5, size / 10);
  const at = { 1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [3, 1], [1, 3], [3, 3]],
    5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]], 6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]] }[value] || [];
  g.fillStyle(INK);
  for (const [cx, cy] of at) g.fillCircle(x + cx * p, y + cy * p, r);
}

// ---------------------------------------------------------------- Knucklebones
const KB_DIE = 22, KB_COL_W = 30, KB_X = 150; // the boards' left edge
export class Knucklebones extends Minigame {
  constructor() { super("Knucklebones"); }

  create(data = {}) {
    this.host = data.host || "WAT";
    this.setup("KNUCKLEBONES");
    this.g = this.add.graphics();
    this.labels = [];
    text(this, KB_X - 10, 40, this.host, { color: COLORS.dim }).setOrigin(1, 0);
    text(this, KB_X - 10, 160, "YOU", { color: COLORS.dim }).setOrigin(1, 0);
    this.theirTotal = text(this, KB_X - 10, 54, "", { color: COLORS.gold }).setOrigin(1, 0);
    this.myTotal = text(this, KB_X - 10, 174, "", { color: COLORS.gold }).setOrigin(1, 0);
    this.colScores = [0, 1].map(who => [0, 1, 2].map(c => text(this, KB_X + c * KB_COL_W + KB_DIE / 2, who ? 30 : 236, "", { color: COLORS.dim }).setOrigin(0.5, 0)));
    panel(this, 270, 40, 200, 180);
    this.msg = text(this, 280, 50, "", { wordWrap: { width: 180 }, lineSpacing: 4 });
    this.again = button(this, 370, 200, 120, 22, `AGAIN (${KB_STAKE}G)`, () => this.newGame());
    this.newGame();
  }

  newGame() {
    if (state.hero.gold < KB_STAKE) { this.msg.setText(`You need ${KB_STAKE} gold to play.`); this.again.setVisible(false); return; }
    state.hero.gold -= KB_STAKE;
    this.showGold();
    this.again.setVisible(false);
    this.game_ = kbNew();
    this.busy = false;
    this.nextTurn();
  }

  nextTurn() {
    const g = this.game_;
    if (g.over) return this.finish();
    kbRoll(g);
    this.draw();
    if (g.turn === 0) { this.msg.setText(`You rolled a ${g.die}. Tap one of your columns to drop it in.`); return; }
    this.msg.setText(`${this.host} rolls a ${g.die}...`);
    this.busy = true;
    this.time.delayedCall(700, () => {
      const r = kbPlace(g, kbBestColumn(g));
      sfx(r.knocked ? "hit" : "select");
      this.busy = false;
      this.nextTurn();
    });
  }

  tap(at) {
    if (!at || this.busy || !this.game_ || this.game_.over || this.game_.turn !== 0) return;
    const { x, y } = at;
    if (y < 140 || y > 250) return; // your board only
    const col = Math.floor((x - KB_X + (KB_COL_W - KB_DIE) / 2) / KB_COL_W);
    if (col < 0 || col > 2) return;
    const r = kbPlace(this.game_, col);
    if (!r.ok) { this.msg.setText(r.reason); sfx("back"); return; }
    sfx(r.knocked ? "hit" : "select");
    if (r.knocked) this.msg.setText(`Knocked out ${r.knocked} of ${this.host}'s!`);
    this.nextTurn();
  }

  draw() {
    const g = this.g, game = this.game_;
    g.clear();
    for (const who of [0, 1]) {
      game.boards[who].forEach((col, c) => {
        const x = KB_X + c * KB_COL_W;
        g.fillStyle(COLORS.panel).fillRect(x - 3, who ? 42 : 150, KB_DIE + 6, 3 * (KB_DIE + 4) + 4);
        if (who === 0 && game.turn === 0 && !game.over && col.length < 3) g.lineStyle(1, GOLD).strokeRect(x - 3, 150, KB_DIE + 6, 3 * (KB_DIE + 4) + 4);
        col.forEach((v, i) => {
          const same = col.filter(d => d === v).length;
          const fill = same === 3 ? 0x7bc96f : same === 2 ? 0xe8d27a : 0xf5f5f0;
          // Your dice stack up from the middle line, theirs down from it.
          const y = who ? 42 + 2 + (2 - i) * (KB_DIE + 4) : 150 + 2 + i * (KB_DIE + 4);
          drawDie(g, x, y, KB_DIE, v, fill);
        });
        this.colScores[who][c].setText(`${kbColumnScore(col)}`);
      });
    }
    if (game.die && !game.over) drawDie(g, 350, 120, 30, game.die, 0xe8d27a);
    const [mine, theirs] = kbScores(game);
    this.myTotal.setText(`${mine}`);
    this.theirTotal.setText(`${theirs}`);
  }

  finish() {
    this.draw();
    const w = kbWinner(this.game_), [mine, theirs] = kbScores(this.game_);
    let line;
    if (w === 0) {
      state.hero.gold += KB_STAKE * 2;
      sfx("coin");
      line = `You win, ${mine} to ${theirs}! +${KB_STAKE * 2} gold.${this.prize("knucklebones")}`;
    } else if (w === 1) { sfx("hurt"); line = `${this.host} wins, ${theirs} to ${mine}. "Better luck next time!"`; }
    else { state.hero.gold += KB_STAKE; line = `A draw, ${mine} all. You get your ${KB_STAKE} gold back.`; }
    this.showGold();
    autosave();
    this.msg.setText(line);
    this.again.setVisible(state.hero.gold >= KB_STAKE);
  }
}

// ---------------------------------------------------------------- Arm wrestling
const BAR_X = 60, BAR_W = 360;
export class ArmWrestle extends Minigame {
  constructor() { super("ArmWrestle"); }

  create() {
    this.setup("ARM WRESTLING");
    this.add.image(70, 124, "hero", heroFrame("side")).setOrigin(0.5, 1).setScale(2);
    this.add.image(410, 124, "woodcutter").setOrigin(0.5, 1).setScale(2).setFlipX(true);
    text(this, 70, 128, "YOU", { color: COLORS.dim }).setOrigin(0.5, 0);
    text(this, 410, 128, "OSWIN", { color: COLORS.dim }).setOrigin(0.5, 0);
    this.g = this.add.graphics();
    this.msg = text(this, WIDTH / 2, 236, "", { wordWrap: { width: 400 }, align: "center" }).setOrigin(0.5, 0);
    this.again = button(this, WIDTH / 2, 100, 100, 22, "REMATCH", () => this.start());
    this.start();
  }

  start() {
    this.bout = awNew(state.hero);
    this.again.setVisible(false);
    this.ready = 1.2; // a moment before GO
    this.flash = 0;
    this.msg.setText("Ready...");
  }

  update(_, ms) {
    const dt = Math.min(ms, 50) / 1000, b = this.bout;
    if (this.ready > 0) { this.ready -= dt; if (this.ready <= 0) this.msg.setText("GO! Tap when the marker's in the green!"); }
    else if (!b.result) { awTick(b, dt); if (b.result) this.end(); }
    this.flash = Math.max(0, this.flash - dt);
    this.draw();
  }

  tap() {
    if (this.ready > 0 || this.bout.result) return;
    const good = awTap(this.bout);
    sfx(good ? "hit" : "miss");
    this.flash = 0.15;
    this.flashGood = good;
    if (this.bout.result) this.end();
  }

  draw() {
    const g = this.g, b = this.bout;
    g.clear();
    // Who's winning: your share of the bar from the left.
    g.fillStyle(INK).fillRect(BAR_X - 2, 148, BAR_W + 4, 20);
    g.fillStyle(BAD).fillRect(BAR_X, 150, BAR_W, 16);
    g.fillStyle(GOOD).fillRect(BAR_X, 150, BAR_W * b.pos / 100, 16);
    g.fillStyle(0xffffff).fillRect(BAR_X + BAR_W / 2 - 1, 146, 2, 24);
    // The timing bar, the green in the middle, and the marker.
    const ty = 190;
    g.fillStyle(INK).fillRect(BAR_X - 2, ty - 2, BAR_W + 4, 24);
    g.fillStyle(COLORS.panel).fillRect(BAR_X, ty, BAR_W, 20);
    g.fillStyle(this.flash > 0 ? (this.flashGood ? 0xa8f09a : BAD) : GOOD).fillRect(BAR_X + BAR_W * (0.5 - AW_ZONE), ty, BAR_W * AW_ZONE * 2, 20);
    g.fillStyle(GOLD).fillRect(BAR_X + BAR_W * b.cursor - 2, ty - 6, 4, 32);
  }

  end() {
    const won = this.bout.result === "won";
    sfx(won ? "coin" : "hurt");
    this.msg.setText(won ? `You slam Oswin's arm to the table! The inn roars.${this.prize("armWrestle")}` : "Oswin pins your arm with a grin. \"Again?\"");
    this.again.setVisible(true);
  }
}

// ---------------------------------------------------------------- Archery
const TGT_X = 150, TGT_Y = 145, TGT_R = 90;
export class Archery extends Minigame {
  constructor() { super("Archery"); }

  /* data.rival: "matthew" for Matthew's rematches at the keep (a higher score to beat, and his prize); else Megan. */
  create(data = {}) {
    const m = data.rival === "matthew";
    this.rival = { name: m ? "Matthew" : "Megan", score: m ? MATTHEW_SCORE : MEGAN_SCORE, game: m ? "archeryMatthew" : "archery" };
    this.setup("ARCHERY CONTEST");
    this.g = this.add.graphics();
    this.marks = this.add.graphics();
    panel(this, 290, 40, 180, 180);
    text(this, 300, 50, `${this.rival.name.toUpperCase()}: ${this.rival.score}`, { color: COLORS.dim });
    this.scoreText = text(this, 300, 70, "", { color: COLORS.gold, lineSpacing: 4, wordWrap: { width: 160 } });
    this.msg = text(this, 300, 130, "", { wordWrap: { width: 160 }, lineSpacing: 4 });
    this.again = button(this, 380, 204, 100, 20, "AGAIN", () => this.start());
    this.start();
  }

  start() {
    this.round = archNew(state.hero);
    this.marks.clear();
    this.again.setVisible(false);
    this.wait = 0;
    this.msg.setText("Tap to loose an arrow when your aim crosses the middle.");
    this.showScores();
  }

  update(_, ms) {
    const dt = Math.min(ms, 50) / 1000;
    this.wait = Math.max(0, this.wait - dt);
    if (!archDone(this.round)) archTick(this.round, dt);
    this.draw();
  }

  tap() {
    if (this.wait > 0 || archDone(this.round)) return;
    const shot = archShoot(this.round);
    sfx(shot.score >= 8 ? "crit" : shot.score ? "hit" : "miss");
    this.marks.fillStyle(INK).fillCircle(TGT_X + shot.x * TGT_R, TGT_Y + shot.y * TGT_R, 3);
    this.marks.fillStyle(0xf5f5f0).fillCircle(TGT_X + shot.x * TGT_R, TGT_Y + shot.y * TGT_R, 1.5);
    this.wait = 0.4; // nock the next arrow
    this.msg.setText(shot.score === 10 ? "Bullseye!" : shot.score ? `${shot.score}!` : "Missed the target!");
    this.showScores();
    if (archDone(this.round)) this.end();
  }

  showScores() {
    const s = this.round.scores;
    this.scoreText.setText(`YOU: ${archTotal(this.round)}\n${s.join(" ")}${" -".repeat(ARROWS - s.length)}`);
  }

  draw() {
    const g = this.g;
    g.clear();
    g.fillStyle(WOOD).fillRect(TGT_X - 40, TGT_Y + TGT_R - 10, 8, 40).fillRect(TGT_X + 32, TGT_Y + TGT_R - 10, 8, 40);
    const colours = [0xf5f5f0, 0xc0392b, 0xf5f5f0, 0x3f6fb0, GOLD];
    g.fillStyle(INK).fillCircle(TGT_X, TGT_Y, TGT_R + 2);
    g.fillStyle(STRAW).fillCircle(TGT_X, TGT_Y, TGT_R);
    [...RINGS].reverse().forEach(([r], i) => g.fillStyle(colours[i]).fillCircle(TGT_X, TGT_Y, r * TGT_R));
    if (archDone(this.round)) return;
    const a = archAim(this.round), x = TGT_X + a.x * TGT_R, y = TGT_Y + a.y * TGT_R;
    g.lineStyle(2, INK).strokeCircle(x, y, 7).lineBetween(x - 11, y, x + 11, y).lineBetween(x, y - 11, x, y + 11);
  }

  end() {
    const { name, score, game } = this.rival, total = archTotal(this.round), won = total > score;
    sfx(won ? "coin" : "back");
    this.msg.setText(won ? `${total} beats ${score}! ${name} laughs and claps.${this.prize(game, "Megan")}`
      : total === score ? `${total}: a tie! "Doesn't count," says ${name}. "Again!"` : `${total}. "Ha! Not bad," says ${name}. "Not good, either."`);
    this.again.setVisible(true);
  }
}

// ---------------------------------------------------------------- Fishing
const FLOAT_X = 240, FLOAT_Y = 140;
const FISH_TEXT = {
  wait: "Waiting for a bite... (don't tap yet!)",
  bite: "A bite! TAP!",
  reel: "Hooked! Tap fast to reel it in!",
  early: "Splash! You struck too soon and scared it off.",
  missed: "Too slow: it took the bait and swam off.",
  escaped: "The line goes slack. It got away!",
};
export class Fishing extends Minigame {
  constructor() { super("Fishing"); }

  create(data = {}) {
    this.spot = FISHING_SPOTS[data.spot] ? data.spot : "willowmere";
    this.setup(`FISHING: ${FISHING_SPOTS[this.spot].name.toUpperCase()}`);
    this.g = this.add.graphics();
    this.msg = text(this, WIDTH / 2, 226, "", { align: "center", wordWrap: { width: 420 } }).setOrigin(0.5, 0);
    this.left = text(this, 10, 30, "", { color: COLORS.dim });
    this.again = button(this, WIDTH / 2, 210, 110, 22, "CAST AGAIN", () => this.cast());
    this.cast();
  }

  cast() {
    if (!fishLeft(state.hero)) return;
    this.line = fishNew(this.spot);
    this.again.setVisible(false);
    this.done = false;
    this.left.setText(`Bites left before you sleep: ${fishLeft(state.hero)}`);
    sfx("select");
  }

  update(_, ms) {
    const dt = Math.min(ms, 50) / 1000, l = this.line;
    if (!this.done) {
      const before = l.phase;
      fishTick(l, dt);
      if (l.phase === "bite" && before !== "bite") sfx("alert");
      if (["missed", "escaped"].includes(l.phase)) this.end();
    }
    this.msg.setText(this.done ? this.endText : FISH_TEXT[l.phase] || "");
    this.draw(ms);
  }

  tap() {
    if (this.done) return;
    const phase = fishTap(this.line);
    if (phase === "reel") sfx("select");
    if (["early", "caught"].includes(phase)) this.end();
  }

  draw() {
    const g = this.g, l = this.line, t = this.time.now / 1000;
    g.clear();
    g.fillStyle(0x2c4f80).fillRect(20, 60, WIDTH - 40, 140);
    g.fillStyle(0x3f6fb0);
    for (let i = 0; i < 6; i++) g.fillRect(40 + ((i * 83 + t * 12) % (WIDTH - 100)), 75 + i * 20, 24, 2);
    // The line from the top of the screen, and the float: bobbing, dipping on a bite, pulled about while you reel.
    const dip = l.phase === "bite" ? 8 : 0, tug = l.phase === "reel" ? Math.sin(t * 20) * 6 : 0;
    const fy = FLOAT_Y + Math.sin(t * 3) * 2 + dip, fx = FLOAT_X + tug;
    g.lineStyle(1, 0xf5f5f0).lineBetween(fx, 40, fx, fy - 6);
    g.fillStyle(INK).fillCircle(fx, fy, 6);
    g.fillStyle(0xc0392b).fillCircle(fx, fy - 1, 5);
    g.fillStyle(0xf5f5f0).fillRect(fx - 5, fy, 10, 4);
    if (l.phase === "bite") { g.lineStyle(2, 0xf5f5f0).strokeCircle(fx, fy + 4, 12 + (t * 30) % 10); }
    if (l.phase === "reel") {
      g.fillStyle(INK).fillRect(WIDTH - 52, 70, 22, 120);
      g.fillStyle(GOOD).fillRect(WIDTH - 50, 72 + 116 * (1 - l.reel), 18, 116 * l.reel);
    }
  }

  end() {
    this.done = true;
    const l = this.line;
    if (l.phase === "caught") {
      const fish = landFish(state.hero, l.fish);
      sfx("coin");
      this.endText = `You caught a ${itemName(fish)}! (In your pack: sell it at any shop.)`;
      autosave();
    } else {
      sfx("back");
      this.endText = FISH_TEXT[l.phase];
    }
    this.left.setText(`Bites left before you sleep: ${fishLeft(state.hero)}`);
    if (fishLeft(state.hero)) this.again.setVisible(true);
    else this.endText += " The fish have stopped biting. Sleep, and try again.";
  }
}
