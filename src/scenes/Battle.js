// The battle screen: the hero on the left, monsters on the right, actions bottom right.
// The rules engine decides everything; this scene plays its log back one line at a time, using the HP each
// log entry recorded, so the bars drain in step with the story. The six buttons show one page at a time: your
// actions, ITEMS (potions and SCROLLs to read), SKILLS (Action Surge and Rune Strike, once you know a rune), and, when
// you lead your companion (tap them to switch), their turn.
import { WIDTH, HEIGHT, FONT, COLORS } from "../config.js";
import { createBattle, playerAction, isPlayerTurn, isAllyTurn } from "../rules/combat.js";
import { readScroll } from "../rules/magic.js";
import { allyAction, castable } from "../rules/tactics.js";
import { TACTICS } from "../rules/party.js";
import { groupPack, baseOf } from "../rules/items.js";
import { SPELLS } from "../data/spells.js";
import { CONDITIONS } from "../rules/conditions.js";
import { armourClass, hasFeature, runesLeft, runeSlots } from "../rules/character.js";
import { state, faint, autosave } from "../state/game.js";
import { hubById } from "../world/travel.js";
import { uiCamera } from "../ui/widgets.js";
import { GROUND_Y, PANEL_Y, ALLY_X, stageZone, drawBackdrop, standParty, stand, breathe } from "../ui/stage.js";
import { playMusic, playJingle, sfx } from "../audio/sound.js";
import { recordBattle } from "../rules/bestiary.js";

const LINE_MS = 700;
const LOG_ROWS = 6;
const BAR_W = 40;

// The potions a fight can use.
const BATTLE_POTIONS = ["potionHealing", "potionGreaterHealing", "potionDexterity"];

const hpColour = (hp, max) => (hp > max / 2 ? 0x7bc96f : hp > max / 4 ? 0xe8b923 : 0xe0645c);

export class Battle extends Phaser.Scene {
  constructor() { super("Battle"); }

  init(data) {
    this.foes = data.foes;
    this.winFlag = data.winFlag || null; // a quest flag to set if you win (the boss fight)
    this.afterWin = data.afterWin || null; // a script to play back in the world if you win (the King's last words)
    this.zone = stageZone(data.zone);
  }

  create() {
    uiCamera(this);
    this.battle = createBattle(state.hero, this.foes);
    // Phaser reuses this scene object for every fight, so reset everything here.
    this.busy = false;
    this.leaving = false;
    this.target = 0;
    this.lines = [];
    this.page = "main"; // which buttons show: main, items, scrolls, ally or allySpells

    drawBackdrop(this, this.zone);
    const ally = this.battle.ally;
    const party = standParty(this, ally?.id);
    this.heroSprite = party.hero;
    // Your companion stands behind you, with their own name and HP bar.
    if (ally) {
      const sprite = party.ally, top = GROUND_Y - sprite.displayHeight;
      const name = this.add.text(ALLY_X, top - 18, ally.name, { fontFamily: FONT, fontSize: "8px", color: COLORS.good, stroke: "#000000", strokeThickness: 2 }).setOrigin(0.5);
      this.add.rectangle(ALLY_X - BAR_W / 2, top - 8, BAR_W, 4, 0x000000, 0.6).setOrigin(0, 0.5);
      const bar = this.add.rectangle(ALLY_X - BAR_W / 2, top - 8, BAR_W, 4, 0x7bc96f).setOrigin(0, 0.5);
      this.allyView = { sprite, name, bar, max: ally.maxHp };
      sprite.setInteractive({ useHandCursor: true }).on("pointerup", () => this.toggleLead());
    } else this.allyView = null;

    const xs = this.battle.monsters.length === 1 ? [360] : [320, 410];
    this.foeViews = this.battle.monsters.map((m, i) => {
      const x = xs[i];
      const sprite = stand(this, x, this.textures.exists(m.id) ? m.id : "goblin").setFlipX(true).setInteractive({ useHandCursor: true });
      sprite.on("pointerup", () => this.select(i));
      const top = GROUND_Y - sprite.displayHeight; // the Goblin King is taller than the rest
      const name = this.add.text(x, top - 18, m.name, { fontFamily: FONT, fontSize: "8px", color: COLORS.text, stroke: "#000000", strokeThickness: 2 }).setOrigin(0.5);
      const barBg = this.add.rectangle(x - BAR_W / 2, top - 8, BAR_W, 4, 0x000000, 0.6).setOrigin(0, 0.5);
      const bar = this.add.rectangle(x - BAR_W / 2, top - 8, BAR_W, 4, 0x7bc96f).setOrigin(0, 0.5);
      return { sprite, name, barBg, bar, x, top, max: m.maxHp };
    });
    this.marker = this.add.triangle(0, 0, 0, 0, 10, 0, 5, 6, 0xe8b923);
    this.tweens.add({ targets: this.marker, y: "+=3", duration: 400, yoyo: true, repeat: -1 });

    breathe(this, [this.heroSprite, ...(this.allyView ? [this.allyView.sprite] : []), ...this.foeViews.map(v => v.sprite)]);

    this.drawPanel();
    this.applyHp(this.battle.log[0].hp);
    this.placeMarker();
    this.cameras.main.fadeIn(250);
    playMusic(this.winFlag ? "boss" : "battle");
    if (ally && !state.flags.leadTip) { // once: how to lead your companion
      state.flags.leadTip = true;
      this.addLine(`Tip: tap ${ally.name} to pick their actions yourself.`);
    }
    this.play(this.battle.log); // the opening line, plus any attacks from monsters that act first
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

    // Six buttons in two columns; what they say and do depends on the page.
    const cols = [356, 436], rows = [PANEL_Y + 24, PANEL_Y + 54, PANEL_Y + 84];
    this.slots = rows.flatMap(y => cols.map(x => {
      const slot = this.button(x, y, "", () => slot.run?.());
      return slot;
    }));
  }

  showPage(page) {
    this.page = page;
    this.refreshButtons();
  }

  button(x, y, label, onTap) {
    const bg = this.add.rectangle(x, y, 76, 24, COLORS.bg).setStrokeStyle(1, COLORS.panelEdge).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontFamily: FONT, fontSize: "8px", color: COLORS.text }).setOrigin(0.5);
    bg.on("pointerup", () => { if (bg.alpha === 1) onTap(); });
    return { bg, text };
  }

  count(base) { return state.hero.inventory.filter(i => i.base === base).length; }
  scrolls() { return groupPack(state.hero.inventory).filter(g => baseOf(g.item).type === "scroll"); }
  items() { return BATTLE_POTIONS.reduce((n, b) => n + this.count(b), 0) + this.scrolls().reduce((n, g) => n + g.count, 0); }

  /* The friend a healing spell should go to: whoever has the smaller share of their HP. */
  friendInNeed() {
    const a = this.battle.ally, p = this.battle.player;
    return a && a.hp / a.maxHp < p.hp / p.maxHp ? "ally" : "player";
  }

  /* The buttons on a page, in order (top left, top right, ...): { label, on, run }, or null for an empty slot.
     `mine`: it's your turn; `hers`: your companion's, and you lead them. */
  pageButtons(page, mine, hers) {
    const h = state.hero, b = this.battle, a = b.ally, heals = this.count("potionHealing");
    const back = to => ({ label: "BACK", on: mine || hers, run: () => this.showPage(to) });
    if (page === "items") {
      const dex = this.count("potionDexterity"), great = this.count("potionGreaterHealing"), scrolls = this.items() - heals - dex - great;
      return [
        { label: `HEAL x${heals}`, on: mine && heals > 0 && h.hp < h.maxHp, run: () => this.act({ type: "potion", base: "potionHealing" }) },
        { label: `DEX x${dex}`, on: mine && dex > 0 && !b.quick, run: () => this.act({ type: "potion", base: "potionDexterity" }) },
        a ? { label: `${a.name.toUpperCase()} x${heals}`, on: mine && heals > 0 && a.hp < a.maxHp, run: () => this.act({ type: "allyPotion" }) } : null,
        { label: `SCROLL x${scrolls}`, on: mine && scrolls > 0, run: () => this.showPage("scrolls") },
        back("main"),
        { label: `GREAT x${great}`, on: mine && great > 0 && h.hp < h.maxHp, run: () => this.act({ type: "potion", base: "potionGreaterHealing" }) },
      ];
    }
    if (page === "scrolls") {
      const list = this.scrolls().slice(0, 5).map(g => {
        const spell = SPELLS[baseOf(g.item).spell];
        return { label: `${spell.short}${g.count > 1 ? ` x${g.count}` : ""}`, on: mine, run: () => this.read(g.item.uid, spell) };
      });
      return [...list, ...Array(5 - list.length).fill(null), back("items")];
    }
    if (page === "ally") {
      return [
        { label: "SHOOT", on: hers, run: () => this.actAlly({ type: "shoot" }) },
        { label: "AUTO", on: hers, run: () => this.actAlly({ type: "auto" }) },
        { label: `YOU x${heals}`, on: hers && heals > 0 && h.hp < h.maxHp, run: () => this.actAlly({ type: "potion", on: "player" }) },
        { label: `${a.name.toUpperCase()} x${heals}`, on: hers && heals > 0 && a.hp < a.maxHp, run: () => this.actAlly({ type: "potion", on: "ally" }) },
        a.casting ? { label: "SPELLS", on: hers && castable(b).length > 0, run: () => this.showPage("allySpells") } : null,
      ];
    }
    if (page === "skills") {
      const surge = { label: "SURGE", on: mine && hasFeature(h, "actionSurge") && h.actionSurge && !b.surging, run: () => this.act({ type: "actionSurge" }) };
      return [surge, { label: `RUNE x${runesLeft(h)}`, on: mine && runesLeft(h) > 0, run: () => this.act({ type: "runeStrike" }) }, null, null, back("main")];
    }
    if (page === "allySpells") {
      const list = castable(b).slice(0, 5).map(c => ({ label: c.spell.short, on: hers, run: () => this.actAlly({ type: "cast", spell: c.id, slotLevel: c.slotLevel }) }));
      return [...list, ...Array(5 - list.length).fill(null), back("ally")];
    }
    return [
      { label: "ATTACK", on: mine, run: () => this.act({ type: "attack" }) },
      { label: "DEFEND", on: mine, run: () => this.act({ type: "defend" }) },
      { label: `ITEMS x${this.items()}`, on: mine && this.items() > 0, run: () => this.showPage("items") },
      { label: "2ND WIND", on: mine && h.hp < h.maxHp && h.secondWind, run: () => this.act({ type: "secondWind" }) },
      { label: "FLEE", on: mine, run: () => this.act({ type: "flee" }) },
      runeSlots(h)
        ? { label: "SKILLS", on: mine, run: () => this.showPage("skills") } // Action Surge and the Warden's runes
        : { label: "SURGE", on: mine && hasFeature(h, "actionSurge") && h.actionSurge && !b.surging, run: () => this.act({ type: "actionSurge" }) },
    ];
  }

  refreshButtons() {
    const mine = !this.busy && isPlayerTurn(this.battle), hers = !this.busy && isAllyTurn(this.battle);
    const allyPage = this.page.startsWith("ally");
    if (hers && !allyPage) this.page = "ally";
    if (mine && allyPage) this.page = "main";
    const entries = this.pageButtons(this.page, mine, hers);
    this.slots.forEach((slot, i) => {
      const e = entries[i];
      slot.bg.setVisible(!!e);
      slot.text.setVisible(!!e);
      slot.run = e?.on ? e.run : null;
      if (!e) return;
      slot.text.setText(e.label);
      slot.bg.setAlpha(e.on ? 1 : 0.4);
      slot.text.setAlpha(e.on ? 1 : 0.4);
    });
    this.marker.setVisible((mine || hers) && this.battle.monsters.filter(m => m.hp > 0).length > 1);
  }

  /* Tapping your companion: lead them (pick their actions yourself) or let them follow their tactics again. */
  toggleLead() {
    const b = this.battle, a = b.ally;
    if (this.leaving || b.state !== "active") return;
    b.leadAlly = !b.leadAlly;
    if (b.leadAlly) state.hero.companion.lead = true; else delete state.hero.companion.lead; // remembered for next time
    sfx("select");
    this.float(this.allyView.sprite, b.leadAlly ? "YOU LEAD" : "AUTO", COLORS.gold);
    this.addLine(b.leadAlly ? `You'll pick ${a.name}'s actions. Tap ${a.name} again to stop.` : `${a.name} fights by tactics (${TACTICS[a.tactics]}).`);
    if (!b.leadAlly && isAllyTurn(b) && !this.busy) return this.actAlly({ type: "auto" });
    this.refreshButtons();
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
    if (action.type === "attack" || action.type === "runeStrike") action.target = this.target;
    this.then(playerAction(this.battle, action));
  }

  /* Reads a scroll: at the monster you've picked, or for a healing spell, at whichever of you needs it more. */
  read(uid, spell) {
    if (this.busy || !isPlayerTurn(this.battle)) return;
    const target = spell.targets === "one" ? this.target : spell.targets === "friend" ? this.friendInNeed() : undefined;
    this.then(readScroll(this.battle, uid, { target }));
  }

  /* Your pick for your companion, when you lead them. */
  actAlly(action) {
    if (this.busy || !isAllyTurn(this.battle)) return;
    const spell = SPELLS[action.spell];
    if (action.type === "shoot" || spell?.targets === "one") action.target = this.target;
    if (spell?.targets === "friend") action.target = this.friendInNeed();
    this.then(allyAction(this.battle, action));
  }

  then(r) {
    if (!r.ok) return this.addLine(r.reason, COLORS.bad);
    this.page = "main";
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
      if (isAllyTurn(this.battle)) this.addLine(`${this.battle.ally.name}'s turn: pick an action, or AUTO.`);
      this.refreshButtons();
    });
  }

  showEvent(e) {
    const good = ["won", "level-up", "ally-level-up", "potion", "ally-potion", "second-wind", "loot", "quick", "surge", "surge-again",
      "ally-heal", "spell-heal", "spell", "scroll", "indomitable"].includes(e.type);
    this.addLine(e.text, good ? COLORS.good : e.type === "lost" ? COLORS.bad : COLORS.text);
    this.applyHp(e.hp);
    const foe = e.target >= 0 ? this.foeViews[e.target].sprite : null;
    switch (e.type) {
      case "attack":
        this.lunge(this.heroSprite, 1);
        sfx("sword");
        if (e.roll.hit) { this.slash(foe, e.roll.crit); this.hit(foe, e.roll.damage, e.roll.crit); this.time.delayedCall(90, () => sfx(e.roll.crit ? "crit" : "hit")); }
        else { this.float(foe, "MISS", COLORS.dim); this.time.delayedCall(60, () => sfx("miss")); }
        if (e.rune) this.float(this.heroSprite, "RUNE!", COLORS.gold);
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
      case "ally-level-up":
        this.float(this.allyView.sprite, "LEVEL UP!", COLORS.gold);
        break;
      case "ally-potion":
        sfx("heal");
        if (e.revived) this.tweens.add({ targets: [this.allyView.sprite, this.allyView.name], alpha: 1, duration: 300 });
        this.float(this.allyView.sprite, `+${e.heal}`, COLORS.good);
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
      case "spell":
      case "scroll":
        sfx("select");
        break;
      case "spell-attack":
      case "spell-save":
      case "spell-hit": {
        const damage = e.roll ? e.roll.damage : e.damage;
        if (damage > 0) { this.slash(foe, e.roll?.crit); this.hit(foe, damage, e.roll?.crit); this.time.delayedCall(90, () => sfx(e.roll?.crit ? "crit" : "hit")); }
        else { this.float(foe, e.save ? "RESIST" : "MISS", COLORS.dim); this.time.delayedCall(60, () => sfx("miss")); }
        break;
      }
      case "spell-heal":
      case "ally-heal": {
        const who = this.spriteOf(e.who);
        sfx("heal");
        if (e.revived) this.tweens.add({ targets: [this.allyView.sprite, this.allyView.name], alpha: 1, duration: 300 });
        this.float(who, `+${e.heal}`, COLORS.good);
        break;
      }
      case "condition":
        this.float(this.spriteOf(e.who), CONDITIONS[e.condition].name.toUpperCase(), COLORS.gold);
        break;
      case "skip":
        this.float(this.spriteOf(e.who), "...", COLORS.dim);
        break;
      case "indomitable":
        sfx("heal");
        this.float(this.heroSprite, "INDOMITABLE!", COLORS.gold);
        break;
      case "surge":
        sfx("heal");
        this.float(this.heroSprite, "SURGE!", COLORS.gold);
        break;
      case "level-up":
        this.showLevel(e.level);
        this.float(this.heroSprite, "LEVEL UP!", COLORS.gold);
        break;
    }
  }

  /* The sprite for a battle key: "player", "ally" or a monster's index. */
  spriteOf(key) {
    return key === "player" ? this.heroSprite : key === "ally" ? this.allyView.sprite : this.foeViews[key].sprite;
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
    recordBattle(state.bestiary, b);
    let title, color;
    if (b.state === "won") {
      if (this.winFlag) state.flags[this.winFlag] = true;
      title = "VICTORY!"; color = COLORS.gold;
      playJingle(b.rewards.levelUps.length ? "levelUp" : "victory");
      lines.push(`+${b.rewards.xp} XP   +${b.rewards.gold} gold`);
      for (const l of b.rewards.levelUps) lines.push(`Level ${l.level}! +${l.hpGain} max HP${l.features.length ? `, ${l.features.join(", ")}` : ""}`);
      if (b.rewards.loot.length) lines.push(`Found: ${b.rewards.loot.join(", ")}`);
    } else if (b.state === "lost") {
      title = "DEFEATED"; color = COLORS.bad;
      playJingle("defeat");
      const { goldLost, hub } = faint();
      lines.push(`You wake up at ${hubById(hub).innName},`, `rested but ${goldLost} gold poorer.`);
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
    const script = this.battle.state === "won" ? this.afterWin : null;
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("World", { quiet, script }));
  }
}
