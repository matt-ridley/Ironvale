// The battle screen: the hero on the left, monsters on the right, actions bottom right.
// The rules engine decides everything; this scene plays its log back one line at a time, using the HP each
// log entry recorded, so the bars drain in step with the story. POTION opens a second set of buttons, one per kind
// of potion you can drink in a fight.
import { WIDTH, HEIGHT, FONT, COLORS } from "../config.js";
import { createBattle, playerAction, isPlayerTurn } from "../rules/combat.js";
import { armourClass } from "../rules/character.js";
import { state, faint, autosave } from "../state/game.js";
import { uiCamera } from "../ui/widgets.js";
import { heroFrame } from "../art/pixels.js";
import { playMusic, playJingle, sfx } from "../audio/sound.js";

const LINE_MS = 700;
const GROUND_Y = 124;
const PANEL_Y = 152;
const LOG_ROWS = 6;
const BAR_W = 40;

const SKY = {
  forest: { sky: 0x1d2b3a, far: 0x1f3a26, ground: 0x3e6a31, groundDark: 0x34592a },
  rocks: { sky: 0x2a2633, far: 0x45424f, ground: 0x6b6b72, groundDark: 0x5a5a61 },
  cave: { sky: 0x0f0d14, far: 0x26222e, ground: 0x3a3440, groundDark: 0x2e2934 },
  meadow: { sky: 0x3a5a8a, far: 0x3f6b3a, ground: 0x5aa04a, groundDark: 0x4a8a3c },
};
SKY.warrens = SKY.cave;
SKY.throne = SKY.cave;

// The potions a fight can use, in button order.
const BATTLE_POTIONS = [{ base: "potionHealing", label: "HEAL" }, { base: "potionDexterity", label: "DEX" }];

const hpColour = (hp, max) => (hp > max / 2 ? 0x7bc96f : hp > max / 4 ? 0xe8b923 : 0xe0645c);

export class Battle extends Phaser.Scene {
  constructor() { super("Battle"); }

  init(data) {
    this.foes = data.foes;
    this.winFlag = data.winFlag || null; // a quest flag to set if you win (the boss fight)
    this.zone = SKY[data.zone] ? data.zone : "forest";
  }

  create() {
    uiCamera(this);
    this.battle = createBattle(state.hero, this.foes);
    // Phaser reuses this scene object for every fight, so reset everything here.
    this.busy = false;
    this.leaving = false;
    this.target = 0;
    this.lines = [];
    this.potionMenu = false;

    this.drawBackdrop();
    this.add.ellipse(110, GROUND_Y, 40, 8, 0x000000, 0.3);
    this.heroSprite = this.add.image(110, GROUND_Y, "hero", heroFrame("side")).setOrigin(0.5, 1).setScale(1.5);
    // Your companion stands behind you, with their own name and HP bar.
    const ally = this.battle.ally;
    if (ally) {
      this.add.ellipse(50, GROUND_Y, 32, 7, 0x000000, 0.3);
      const sprite = this.add.image(50, GROUND_Y, ally.id).setOrigin(0.5, 1).setScale(2);
      const top = GROUND_Y - sprite.displayHeight;
      const name = this.add.text(50, top - 18, ally.name, { fontFamily: FONT, fontSize: "8px", color: COLORS.good, stroke: "#000000", strokeThickness: 2 }).setOrigin(0.5);
      this.add.rectangle(50 - BAR_W / 2, top - 8, BAR_W, 4, 0x000000, 0.6).setOrigin(0, 0.5);
      const bar = this.add.rectangle(50 - BAR_W / 2, top - 8, BAR_W, 4, 0x7bc96f).setOrigin(0, 0.5);
      this.allyView = { sprite, name, bar, max: ally.maxHp };
    } else this.allyView = null;

    const xs = this.battle.monsters.length === 1 ? [360] : [320, 410];
    this.foeViews = this.battle.monsters.map((m, i) => {
      const x = xs[i];
      this.add.ellipse(x, GROUND_Y, 40, 8, 0x000000, 0.3);
      const sprite = this.add.image(x, GROUND_Y, this.textures.exists(m.id) ? m.id : "goblin")
        .setOrigin(0.5, 1).setScale(1.5).setFlipX(true).setInteractive({ useHandCursor: true });
      sprite.on("pointerup", () => this.select(i));
      const top = GROUND_Y - sprite.displayHeight; // the Goblin King is taller than the rest
      const name = this.add.text(x, top - 18, m.name, { fontFamily: FONT, fontSize: "8px", color: COLORS.text, stroke: "#000000", strokeThickness: 2 }).setOrigin(0.5);
      const barBg = this.add.rectangle(x - BAR_W / 2, top - 8, BAR_W, 4, 0x000000, 0.6).setOrigin(0, 0.5);
      const bar = this.add.rectangle(x - BAR_W / 2, top - 8, BAR_W, 4, 0x7bc96f).setOrigin(0, 0.5);
      return { sprite, name, barBg, bar, x, top, max: m.maxHp };
    });
    this.marker = this.add.triangle(0, 0, 0, 0, 10, 0, 5, 6, 0xe8b923);
    this.tweens.add({ targets: this.marker, y: "+=3", duration: 400, yoyo: true, repeat: -1 });

    // Everyone breathes a little while waiting, out of step with each other.
    [this.heroSprite, ...(this.allyView ? [this.allyView.sprite] : []), ...this.foeViews.map(v => v.sprite)].forEach((s, i) =>
      this.tweens.add({ targets: s, scaleY: s.scaleY * 0.97, duration: 700 + i * 130, yoyo: true, repeat: -1, ease: "Sine.inOut" }));

    this.drawPanel();
    this.applyHp(this.battle.log[0].hp);
    this.placeMarker();
    this.cameras.main.fadeIn(250);
    playMusic(this.winFlag ? "boss" : "battle");
    this.play(this.battle.log); // the opening line, plus any attacks from monsters that act first
  }

  drawBackdrop() {
    const c = SKY[this.zone], g = this.add.graphics();
    g.fillStyle(c.sky).fillRect(0, 0, WIDTH, PANEL_Y);
    g.fillStyle(c.far);
    if (this.zone === "forest") {
      for (let x = -10; x < WIDTH + 20; x += 26) {
        const h = 40 + ((x * 37) % 23);
        g.fillTriangle(x, 100, x + 14, 100 - h, x + 28, 100);
      }
    } else {
      for (let x = -20; x < WIDTH + 40; x += 60) g.fillEllipse(x + ((x * 13) % 20), 100, 80, 50 + ((x * 7) % 30));
    }
    g.fillStyle(c.ground).fillRect(0, 96, WIDTH, PANEL_Y - 96);
    g.fillStyle(c.groundDark);
    for (let x = 0; x < WIDTH; x += 12) g.fillRect(x + ((x * 7) % 9), 100 + ((x * 5) % 48), 3, 2);
  }

  drawPanel() {
    this.add.rectangle(0, PANEL_Y, WIDTH, HEIGHT - PANEL_Y, COLORS.panel).setOrigin(0).setStrokeStyle(1, COLORS.panelEdge);
    this.heroLevel = this.add.text(10, PANEL_Y + 7, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.gold });
    this.showLevel(this.battle.log[0].level);
    this.add.rectangle(100, PANEL_Y + 11, 80, 6, 0x000000, 0.6).setOrigin(0, 0.5);
    this.heroBar = this.add.rectangle(100, PANEL_Y + 11, 80, 6, 0x7bc96f).setOrigin(0, 0.5);
    this.heroHp = this.add.text(186, PANEL_Y + 7, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.text });
    this.add.text(250, PANEL_Y + 7, `AC ${armourClass(state.hero)}`, { fontFamily: FONT, fontSize: "8px", color: COLORS.dim });
    this.logText = this.add.text(10, PANEL_Y + 24, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.text, lineSpacing: 5, wordWrap: { width: 290 } });

    const cols = [356, 436], rows = [PANEL_Y + 24, PANEL_Y + 54, PANEL_Y + 84];
    this.buttons = {
      attack: this.button(cols[0], rows[0], "ATTACK", () => this.act({ type: "attack" })),
      defend: this.button(cols[1], rows[0], "DEFEND", () => this.act({ type: "defend" })),
      potion: this.button(cols[0], rows[1], "POTION", () => this.showPotions(true)),
      secondWind: this.button(cols[1], rows[1], "2ND WIND", () => this.act({ type: "secondWind" })),
      flee: this.button(cols[0], rows[2], "FLEE", () => this.act({ type: "flee" })),
    };
    this.potionButtons = BATTLE_POTIONS.map((p, i) => ({ ...p, ...this.button(cols[i], rows[0], p.label, () => this.act({ type: "potion", base: p.base })) }));
    this.backButton = this.button(cols[0], rows[1], "BACK", () => this.showPotions(false));
    this.showPotions(false);
  }

  /* Swaps the action buttons for the potion buttons (on = true) and back. */
  showPotions(on) {
    if (on && (this.busy || !isPlayerTurn(this.battle))) return;
    this.potionMenu = on;
    for (const b of Object.values(this.buttons)) { b.bg.setVisible(!on); b.text.setVisible(!on); }
    for (const b of [...this.potionButtons, this.backButton]) { b.bg.setVisible(on); b.text.setVisible(on); }
    this.refreshButtons();
  }

  button(x, y, label, onTap) {
    const bg = this.add.rectangle(x, y, 76, 24, COLORS.bg).setStrokeStyle(1, COLORS.panelEdge).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontFamily: FONT, fontSize: "8px", color: COLORS.text }).setOrigin(0.5);
    bg.on("pointerup", () => { if (bg.alpha === 1) onTap(); });
    return { bg, text };
  }

  potions(base) { return state.hero.inventory.filter(i => (base ? i.base === base : BATTLE_POTIONS.some(p => p.base === i.base))).length; }

  refreshButtons() {
    const ready = !this.busy && isPlayerTurn(this.battle);
    const enable = (b, on) => { b.bg.setAlpha(on ? 1 : 0.4); b.text.setAlpha(on ? 1 : 0.4); };
    this.buttons.potion.text.setText(`POTION x${this.potions()}`);
    enable(this.buttons.attack, ready);
    enable(this.buttons.defend, ready);
    enable(this.buttons.flee, ready);
    const hurt = state.hero.hp < state.hero.maxHp;
    enable(this.buttons.potion, ready && this.potions() > 0);
    for (const b of this.potionButtons) {
      b.text.setText(`${b.label} x${this.potions(b.base)}`);
      const usable = b.base === "potionHealing" ? hurt : !this.battle.quick;
      enable(b, ready && usable && this.potions(b.base) > 0);
    }
    enable(this.backButton, ready);
    enable(this.buttons.secondWind, ready && hurt && state.hero.secondWind);
    this.marker.setVisible(ready && this.battle.monsters.filter(m => m.hp > 0).length > 1);
  }

  select(i) {
    if (this.busy || this.battle.monsters[i].hp <= 0) return;
    this.target = i;
    this.placeMarker();
  }

  placeMarker() {
    const v = this.foeViews[this.target];
    this.marker.setPosition(v.x, v.top - 32);
  }

  act(action) {
    if (this.busy || !isPlayerTurn(this.battle)) return;
    if (action.type === "attack") action.target = this.target;
    const r = playerAction(this.battle, action);
    if (!r.ok) return this.addLine(r.reason, COLORS.bad);
    if (this.potionMenu) this.showPotions(false);
    this.play(r.events);
  }

  /* Plays log entries one after another, then hands control back (or shows the result). */
  play(events) {
    this.busy = true;
    this.refreshButtons();
    events.forEach((e, i) => this.time.delayedCall(i * LINE_MS, () => this.showEvent(e)));
    this.time.delayedCall(events.length * LINE_MS, () => {
      this.busy = false;
      if (this.battle.state !== "active") return this.showResult();
      if (this.battle.monsters[this.target].hp <= 0) this.target = this.battle.monsters.findIndex(m => m.hp > 0);
      this.placeMarker();
      this.refreshButtons();
    });
  }

  showEvent(e) {
    const good = ["won", "level-up", "potion", "second-wind", "loot", "quick"].includes(e.type);
    this.addLine(e.text, good ? COLORS.good : e.type === "lost" ? COLORS.bad : COLORS.text);
    this.applyHp(e.hp);
    const foe = e.target >= 0 ? this.foeViews[e.target].sprite : null;
    switch (e.type) {
      case "attack":
        this.lunge(this.heroSprite, 1);
        sfx("sword");
        if (e.roll.hit) { this.slash(foe, e.roll.crit); this.hit(foe, e.roll.damage, e.roll.crit); this.time.delayedCall(90, () => sfx(e.roll.crit ? "crit" : "hit")); }
        else { this.float(foe, "MISS", COLORS.dim); this.time.delayedCall(60, () => sfx("miss")); }
        break;
      case "monster-attack": {
        this.lunge(this.foeViews[e.actor].sprite, -1);
        const victim = e.onAlly ? this.allyView.sprite : this.heroSprite;
        if (e.roll.hit) { this.hit(victim, e.roll.damage, e.roll.crit); this.cameras.main.shake(120, 0.006); this.time.delayedCall(90, () => sfx("hurt")); }
        else { this.float(victim, "MISS", COLORS.dim); this.time.delayedCall(60, () => sfx("miss")); }
        break;
      }
      case "ally-attack":
        this.lunge(this.allyView.sprite, 1);
        sfx("sword");
        if (e.roll.hit) { this.slash(foe, e.roll.crit); this.hit(foe, e.roll.damage, e.roll.crit); this.time.delayedCall(90, () => sfx(e.roll.crit ? "crit" : "hit")); }
        else { this.float(foe, "MISS", COLORS.dim); this.time.delayedCall(60, () => sfx("miss")); }
        break;
      case "ally-down":
        this.tweens.add({ targets: [this.allyView.sprite, this.allyView.name], alpha: 0.35, duration: 400 });
        break;
      case "loot":
        sfx("coin");
        break;
      case "defeat": {
        const v = this.foeViews[e.target];
        this.tweens.add({ targets: [v.sprite, v.name, v.bar, v.barBg], alpha: 0, duration: 400 });
        break;
      }
      case "potion":
      case "second-wind":
        sfx("heal");
        this.float(this.heroSprite, `+${e.heal}`, COLORS.good);
        break;
      case "quick":
        sfx("heal");
        this.float(this.heroSprite, "QUICK!", COLORS.gold);
        break;
      case "defend":
        this.float(this.heroSprite, "GUARD", COLORS.text);
        break;
      case "level-up":
        this.showLevel(e.level);
        this.float(this.heroSprite, "LEVEL UP!", COLORS.gold);
        break;
    }
  }

  showLevel(level) {
    this.heroLevel.setText(`${state.hero.name.toUpperCase()} LV ${level}`);
  }

  addLine(text, color = COLORS.text) {
    this.lines.push(text);
    const rows = this.logText.setColor(color).getWrappedText(this.lines.slice(-LOG_ROWS).join("\n"));
    this.logText.setText(rows.slice(-LOG_ROWS));
  }

  applyHp(hp) {
    const max = state.hero.maxHp, shown = Math.min(hp.player, max);
    this.heroBar.width = 80 * shown / max;
    this.heroBar.fillColor = hpColour(shown, max);
    this.heroHp.setText(`${hp.player}/${max}`);
    hp.monsters.forEach((h, i) => {
      const v = this.foeViews[i];
      v.bar.width = BAR_W * h / v.max;
      v.bar.fillColor = hpColour(h, v.max);
    });
    if (this.allyView && hp.ally !== null && hp.ally !== undefined) {
      const v = this.allyView;
      v.bar.width = BAR_W * hp.ally / v.max;
      v.bar.fillColor = hpColour(hp.ally, v.max);
    }
  }

  lunge(sprite, dir) {
    this.tweens.add({ targets: sprite, x: sprite.x + dir * 14, duration: 90, yoyo: true });
  }

  /* A quick white sword arc across the target. */
  slash(sprite, crit) {
    const g = this.add.graphics({ x: sprite.x, y: sprite.y - 26 }).setDepth(25);
    g.lineStyle(crit ? 4 : 3, crit ? 0xffe28a : 0xffffff, 1);
    g.beginPath(); g.arc(0, 0, 22, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(330)); g.strokePath();
    g.setScale(0.6).setAngle(-20);
    this.tweens.add({ targets: g, scale: 1.1, angle: 25, alpha: 0, duration: 260, ease: "Quad.out", onComplete: () => g.destroy() });
  }

  hit(sprite, damage, crit) {
    // Knocked back a little, then settle.
    this.tweens.add({ targets: sprite, x: sprite.x + (sprite === this.heroSprite || sprite === this.allyView?.sprite ? -6 : 6), duration: 70, yoyo: true, delay: 90, ease: "Quad.out" });
    this.time.delayedCall(90, () => {
      sprite.setTintFill(0xffffff);
      this.time.delayedCall(80, () => sprite.clearTint());
    });
    this.float(sprite, crit ? `CRIT -${damage}` : `-${damage}`, crit ? COLORS.gold : COLORS.bad);
  }

  float(sprite, text, color) {
    const t = this.add.text(sprite.x, sprite.y - 34, text, { fontFamily: FONT, fontSize: "10px", color, stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, delay: 350, duration: 600, onComplete: () => t.destroy() });
  }

  showResult() {
    const b = this.battle, lines = [];
    let title, color;
    if (b.state === "won") {
      if (this.winFlag) state.flags[this.winFlag] = true;
      title = "VICTORY!"; color = COLORS.gold;
      playJingle(b.rewards.levelUps.length ? "levelUp" : "victory");
      lines.push(`+${b.rewards.xp} XP   +${b.rewards.gold} gold`);
      for (const l of b.rewards.levelUps) lines.push(`Level ${l.level}! +${l.hpGain} max HP`);
      if (b.rewards.loot.length) lines.push(`Found: ${b.rewards.loot.join(", ")}`);
    } else if (b.state === "lost") {
      title = "DEFEATED"; color = COLORS.bad;
      playJingle("defeat");
      const { goldLost } = faint();
      lines.push("You wake up in Oakhollow,", `rested but ${goldLost} gold poorer.`);
      if (state.hero.bank) lines.push(`Your ${state.hero.bank} gold in the bank is safe.`);
    } else {
      title = "ESCAPED"; color = COLORS.text;
      lines.push("You live to fight another day.");
    }
    autosave(); // rewards, or waking up in the village, are kept even if the app closes on this screen
    this.marker.setVisible(false);
    this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.55).setOrigin(0).setDepth(30);
    this.add.rectangle(WIDTH / 2, 100, 280, 110, COLORS.panel).setStrokeStyle(2, COLORS.panelEdge).setDepth(31);
    this.add.text(WIDTH / 2, 64, title, { fontFamily: FONT, fontSize: "16px", color }).setOrigin(0.5).setDepth(32);
    this.add.text(WIDTH / 2, 98, lines.join("\n"), { fontFamily: FONT, fontSize: "8px", color: COLORS.text, align: "center", lineSpacing: 6 }).setOrigin(0.5).setDepth(32);
    const prompt = this.add.text(WIDTH / 2, 140, "TAP TO CONTINUE", { fontFamily: FONT, fontSize: "8px", color: COLORS.dim }).setOrigin(0.5).setDepth(32);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
    // A short pause so a tap meant for the last action doesn't skip the result.
    this.time.delayedCall(500, () => {
      this.input.once("pointerup", () => this.leave());
      this.input.keyboard.once("keydown", () => this.leave());
    });
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    const quiet = this.battle.state !== "lost"; // back where you were, so no area banner
    this.cameras.main.fadeOut(250);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("World", { quiet }));
  }
}
