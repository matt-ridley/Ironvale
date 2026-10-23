// The battle screen: the hero on the left, monsters on the right, actions bottom right.
// The rules engine decides everything; this scene plays its log back one line at a time, using the HP each
// log entry recorded, so the bars drain in step with the story. The six buttons show one page at a time: your
// actions, ITEMS (potions and SCROLLs to read), SKILLS (Action Surge and the Warden's runes, once you know one), and, when
// you lead your companion (tap them to switch), their turn. When a monster's blow would hit you and Iron Ward could stop
// it, the fight stops and asks (IRON WARD or TAKE IT). A waystone's trial can end after a number of rounds
// (surviveRounds), or ask you to keep your companion standing (guardAlly: if they fall, the trial isn't passed).
// data.second (a companion's id) brings a second companion into the fight: from the roster, or as a guest. Each
// companion has their own sprite, bar and lead toggle; the ally page is for whichever of them is taking their turn.
import { WIDTH, HEIGHT, FONT, COLORS } from "../config.js";
import { createBattle, playerAction, isPlayerTurn, isAllyTurn, isReacting, reactAction, allyTurnKey, allyKeys, partyKeys, isAllyKey, combatant } from "../rules/combat.js";
import { readScroll } from "../rules/magic.js";
import { allyAction, castable, canFlyby, quillFlyby, canVolley } from "../rules/tactics.js";
import { TACTICS, secondCompanion } from "../rules/party.js";
import { groupPack, baseOf } from "../rules/items.js";
import { SPELLS } from "../data/spells.js";
import { CONDITIONS } from "../rules/conditions.js";
import { armourClass, hasFeature, runesLeft, runeSlots, knowsRune } from "../rules/character.js";
import { state, faint, autosave } from "../state/game.js";
import { hubById } from "../world/travel.js";
import { uiCamera } from "../ui/widgets.js";
import { GROUND_Y, PANEL_Y, stageZone, drawBackdrop, standParty, stand, breathe } from "../ui/stage.js";
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
    this.afterFail = data.afterFail || null; // ...or if you win but fail the trial (your companion fell)
    this.surviveRounds = data.surviveRounds || 0; // a waystone's trial: hold out this many rounds
    this.guardAlly = !!data.guardAlly; // a waystone's trial: keep your companion standing
    this.music = data.music || null; // a boss's own track (Thorne's)
    this.second = data.second || null; // a second companion's id
    this.zone = stageZone(data.zone);
  }

  create() {
    uiCamera(this);
    this.battle = createBattle(state.hero, this.foes, Math.random, { surviveRounds: this.surviveRounds, second: this.second && secondCompanion(state.hero, this.second) });
    // Phaser reuses this scene object for every fight, so reset everything here.
    this.busy = false;
    this.leaving = false;
    this.target = 0;
    this.lines = [];
    this.page = "main"; // which buttons show: main, items, scrolls, ally or allySpells

    drawBackdrop(this, this.zone);
    const ally = this.battle.ally;
    const party = standParty(this, ally?.id, this.battle.ally2?.id);
    this.heroSprite = party.hero;
    // Your companions stand behind you, each with their own name and HP bar.
    this.allyViews = {};
    for (const key of allyKeys(this.battle)) {
      const a = this.battle[key], sprite = party[key], x = sprite.x, top = GROUND_Y - sprite.displayHeight;
      const name = this.add.text(x, top - 18, a.name, { fontFamily: FONT, fontSize: "8px", color: COLORS.good, stroke: "#000000", strokeThickness: 2 }).setOrigin(0.5);
      this.add.rectangle(x - BAR_W / 2, top - 8, BAR_W, 4, 0x000000, 0.6).setOrigin(0, 0.5);
      const bar = this.add.rectangle(x - BAR_W / 2, top - 8, BAR_W, 4, 0x7bc96f).setOrigin(0, 0.5);
      this.allyViews[key] = { sprite, name, bar, max: a.maxHp };
      sprite.setInteractive({ useHandCursor: true }).on("pointerup", () => this.toggleLead(key));
    }

    const xs = this.battle.monsters.length === 1 ? [360] : [320, 410];
    this.foeViews = this.battle.monsters.map((m, i) => {
      const x = xs[i];
      const sprite = stand(this, x, this.textures.exists(m.id) ? m.id : "goblin").setFlipX(true).setInteractive({ useHandCursor: true });
      sprite.on("pointerup", () => this.select(i));
      const top = GROUND_Y - sprite.displayHeight; // the Goblin King is taller than the rest
      const name = this.add.text(x, top - 18, m.label, { fontFamily: FONT, fontSize: "8px", color: COLORS.text, stroke: "#000000", strokeThickness: 2 }).setOrigin(0.5);
      const barBg = this.add.rectangle(x - BAR_W / 2, top - 8, BAR_W, 4, 0x000000, 0.6).setOrigin(0, 0.5);
      const bar = this.add.rectangle(x - BAR_W / 2, top - 8, BAR_W, 4, 0x7bc96f).setOrigin(0, 0.5);
      return { sprite, name, barBg, bar, x, top, max: m.maxHp };
    });
    this.marker = this.add.triangle(0, 0, 0, 0, 10, 0, 5, 6, 0xe8b923);
    this.tweens.add({ targets: this.marker, y: "+=3", duration: 400, yoyo: true, repeat: -1 });

    breathe(this, [this.heroSprite, ...Object.values(this.allyViews).map(v => v.sprite), ...this.foeViews.map(v => v.sprite)]);

    this.drawPanel();
    this.applyHp(this.battle.log[0].hp);
    this.placeMarker();
    this.cameras.main.fadeIn(250);
    playMusic(this.music || (this.winFlag ? "boss" : "battle"));
    if (ally && !state.flags.leadTip) { // once: how to lead your companion
      state.flags.leadTip = true;
      this.addLine(`Tip: tap ${this.battle.ally2 ? "a companion" : ally.name} to pick their actions yourself.`);
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
  scrolls() { return groupPack(state.hero.inventory).filter(g => baseOf(g.item).type === "scroll" && SPELLS[baseOf(g.item).spell].kind !== "reaction"); }
  items() { return BATTLE_POTIONS.reduce((n, b) => n + this.count(b), 0) + this.scrolls().reduce((n, g) => n + g.count, 0); }

  /* The friend a healing spell should go to: whoever has the smallest share of their HP (you, on a tie). */
  friendInNeed(keys = partyKeys(this.battle)) {
    const share = k => { const c = combatant(this.battle, k); return c.hp / c.maxHp; };
    return keys.reduce((best, k) => (share(k) < share(best) ? k : best), keys[0]);
  }

  /* The buttons on a page, in order (top left, top right, ...): { label, on, run }, or null for an empty slot.
     `mine`: it's your turn; `hers`: your companion's, and you lead them. */
  pageButtons(page, mine, hers) {
    const h = state.hero, b = this.battle, k = allyTurnKey(b) || "ally", a = b[k], heals = this.count("potionHealing");
    const needy = b.ally && this.friendInNeed(allyKeys(b)), n = needy && b[needy]; // the companion your potion would go to
    const back = to => ({ label: "BACK", on: mine || hers, run: () => this.showPage(to) });
    if (page === "items") {
      const dex = this.count("potionDexterity"), great = this.count("potionGreaterHealing"), scrolls = this.items() - heals - dex - great;
      return [
        { label: `HEAL x${heals}`, on: mine && heals > 0 && h.hp < h.maxHp, run: () => this.act({ type: "potion", base: "potionHealing" }) },
        { label: `DEX x${dex}`, on: mine && dex > 0 && !b.quick, run: () => this.act({ type: "potion", base: "potionDexterity" }) },
        n ? { label: `${n.name.toUpperCase()} x${heals}`, on: mine && heals > 0 && n.hp < n.maxHp, run: () => this.act({ type: "allyPotion", on: needy }) } : null,
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
        { label: `${a.name.toUpperCase()} x${heals}`, on: hers && heals > 0 && a.hp < a.maxHp, run: () => this.actAlly({ type: "potion", on: k }) },
        a.casting ? { label: "SPELLS", on: hers && castable(b, k).length > 0, run: () => this.showPage("allySpells") }
          : a.src?.volley ? { label: "VOLLEY", on: hers && canVolley(b, k), run: () => this.actAlly({ type: "volley" }) } : null,
        a.id === "rachel" ? { label: "FLYBY", on: hers && canFlyby(b), run: () => this.flyby() } : null,
      ];
    }
    if (page === "skills") {
      const surge = { label: "SURGE", on: mine && hasFeature(h, "actionSurge") && h.actionSurge && !b.surging, run: () => this.act({ type: "actionSurge" }) };
      const rune = (id, label, type) => (knowsRune(h, id) ? { label, on: mine && runesLeft(h) > 0, run: () => this.act({ type }) } : null);
      const oath = rune("chainLightning", "CHAIN", "chainLightning") || rune("dawnstrike", "DAWN", "dawnstrike");
      return [surge, rune("runeStrike", `RUNE x${runesLeft(h)}`, "runeStrike"), rune("wardensCall", "CALL", "wardensCall"), rune("binding", "BIND", "binding"), oath, back("main")];
    }
    if (page === "react") {
      const on = !this.busy && isReacting(b), ward = b.pending?.kind !== "counter";
      return [{ label: ward ? "IRON WARD" : "COUNTER", on, run: () => this.react(true) }, { label: ward ? "TAKE IT" : "LET IT GO", on, run: () => this.react(false) }, null, null, null, null];
    }
    if (page === "allySpells") {
      const list = castable(b, k).slice(0, 5).map(c => ({ label: c.spell.short, on: hers, run: () => this.actAlly({ type: "cast", spell: c.id, slotLevel: c.slotLevel }) }));
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
    if (isReacting(this.battle)) this.page = "react";
    else if (this.page === "react") this.page = "main";
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

  /* Tapping a companion: lead them (pick their actions yourself) or let them follow their tactics again. */
  toggleLead(key) {
    const b = this.battle, a = b[key], prop = key === "ally2" ? "leadAlly2" : "leadAlly";
    if (this.leaving || b.state !== "active") return;
    b[prop] = !b[prop];
    if (b[prop]) a.src.lead = true; else delete a.src.lead; // remembered for next time
    sfx("select");
    this.float(this.allyViews[key].sprite, b[prop] ? "YOU LEAD" : "AUTO", COLORS.gold);
    this.addLine(b[prop] ? `You'll pick ${a.name}'s actions. Tap ${a.name} again to stop.` : `${a.name} fights by tactics (${TACTICS[a.tactics]}).`);
    if (!b[prop] && allyTurnKey(b) === key && !this.busy) return this.actAlly({ type: "auto" });
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
    if (["attack", "runeStrike", "binding", "dawnstrike"].includes(action.type)) action.target = this.target;
    this.then(playerAction(this.battle, action));
  }

  /* Iron Ward, or take the blow. */
  react(useWard) {
    if (this.busy || !isReacting(this.battle)) return;
    this.then(reactAction(this.battle, useWard));
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

  /* Quill flies at the monster (free: Rachel's turn goes on). */
  flyby() {
    if (this.busy || !isAllyTurn(this.battle)) return;
    this.then(quillFlyby(this.battle), "ally");
  }

  then(r, page = "main") {
    if (!r.ok) return this.addLine(r.reason, COLORS.bad);
    this.page = page;
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
      if (isAllyTurn(this.battle)) this.addLine(`${this.battle[allyTurnKey(this.battle)].name}'s turn: pick an action, or AUTO.`);
      this.refreshButtons();
    });
  }

  showEvent(e) {
    const good = ["won", "level-up", "ally-level-up", "potion", "ally-potion", "second-wind", "loot", "quick", "surge", "surge-again",
      "ally-heal", "spell-heal", "spell", "scroll", "indomitable", "flyby", "badge", "ward", "call", "call-heal", "survived", "volley", "counter", "unbroken", "blink", "chain", "dawn-light"].includes(e.type);
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
        const victim = this.spriteOf(e.who ?? (e.onAlly ? "ally" : "player"));
        if (e.roll.hit) { this.hit(victim, e.roll.damage, e.roll.crit); this.cameras.main.shake(120, 0.006); this.time.delayedCall(90, () => sfx("hurt")); }
        else { this.float(victim, "MISS", COLORS.dim); this.time.delayedCall(60, () => sfx("miss")); }
        break;
      }
      case "ally-attack":
        this.lunge(this.spriteOf(e.by || "ally"), 1);
        sfx("sword");
        if (e.roll.hit) { this.slash(foe, e.roll.crit); this.hit(foe, e.roll.damage, e.roll.crit); this.time.delayedCall(90, () => sfx(e.roll.crit ? "crit" : "hit")); }
        else { this.float(foe, "MISS", COLORS.dim); this.time.delayedCall(60, () => sfx("miss")); }
        break;
      case "volley":
        sfx("sword");
        this.float(this.spriteOf(e.by || "ally"), "VOLLEY!", COLORS.gold);
        break;
      case "ally-level-up":
        this.float(this.spriteOf(e.who || "ally"), "LEVEL UP!", COLORS.gold);
        break;
      case "ally-potion":
        sfx("heal");
        if (e.revived) this.revive(e.who || "ally");
        this.float(this.spriteOf(e.who || "ally"), `+${e.heal}`, COLORS.good);
        break;
      case "ally-down": {
        const v = this.allyViews[e.who || "ally"];
        this.tweens.add({ targets: [v.sprite, v.name], alpha: 0.35, duration: 400 });
        break;
      }
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
        if (e.revived && isAllyKey(e.who)) this.revive(e.who);
        this.float(who, `+${e.heal}`, COLORS.good);
        break;
      }
      case "condition":
        this.float(this.spriteOf(e.who), CONDITIONS[e.condition].name.toUpperCase(), COLORS.gold);
        break;
      case "skip":
        this.float(this.spriteOf(e.who), "...", COLORS.dim);
        break;
      case "flyby": {
        const owl = this.add.image(this.spriteOf(this.rachelKey()).x, GROUND_Y - 70, "quill").setScale(0.8).setDepth(22);
        this.tweens.add({ targets: owl, x: this.foeViews[e.target]?.x ?? 360, y: GROUND_Y - 40, duration: 260, yoyo: true, ease: "Sine.inOut", onComplete: () => owl.destroy() });
        sfx("select");
        this.float(this.heroSprite, "FLYBY!", COLORS.gold);
        break;
      }
      case "badge":
        sfx("coin");
        this.float(this.heroSprite, "+1!", COLORS.gold);
        break;
      case "monster-cast":
        sfx("alert");
        this.lunge(this.foeViews[e.actor].sprite, -1);
        this.float(this.foeViews[e.actor].sprite, e.spell.toUpperCase(), COLORS.gold);
        break;
      case "monster-spell":
        if (e.damage) { this.hit(this.spriteOf(e.who), e.damage, false); this.cameras.main.shake(120, 0.006); }
        else this.float(this.spriteOf(e.who), "RESIST", COLORS.dim);
        break;
      case "unbroken":
        sfx("crit");
        this.cameras.main.flash(250, 200, 200, 220);
        this.float(this.heroSprite, "UNBROKEN!", COLORS.gold);
        break;
      case "blink":
        sfx("select");
        this.float(this.heroSprite, "BLINK!", COLORS.gold);
        this.tweens.add({ targets: this.heroSprite, alpha: 0.2, duration: 90, yoyo: true });
        break;
      case "chain":
        sfx("crit");
        this.cameras.main.flash(200, 160, 210, 255);
        this.float(this.heroSprite, "CHAIN LIGHTNING!", COLORS.gold);
        break;
      case "dawn-light":
        sfx("heal");
        this.float(this.spriteOf(e.who), `+${e.heal}`, COLORS.good);
        break;
      case "counter-prompt":
        sfx("alert");
        this.float(this.foeViews[e.actor].sprite, "CASTING...", COLORS.gold);
        break;
      case "counter":
        sfx("crit");
        this.float(this.spriteOf(this.rachelKey()), "COUNTER!", COLORS.gold);
        break;
      case "hesitate":
        this.float(this.foeViews[e.who].sprite, "...", COLORS.dim);
        break;
      case "ward-prompt":
        sfx("alert");
        this.lunge(this.foeViews[e.actor].sprite, -1);
        this.float(this.heroSprite, "!", COLORS.gold);
        break;
      case "ward":
        sfx("clang");
        this.float(this.heroSprite, "IRON WARD!", COLORS.gold);
        this.heroSprite.setTintFill(0x9fd0ff);
        this.time.delayedCall(160, () => this.heroSprite.clearTint());
        break;
      case "call":
        sfx("heal");
        this.float(this.heroSprite, "CALL!", COLORS.gold);
        break;
      case "call-heal":
        if (e.revived && isAllyKey(e.who)) this.revive(e.who);
        if (e.heal) this.float(this.spriteOf(e.who), `+${e.heal}`, COLORS.good);
        break;
      case "regen":
        sfx("heal");
        this.float(this.foeViews[e.target].sprite, `+${e.heal}`, COLORS.good);
        break;
      case "poison":
        this.hit(this.spriteOf(e.who), e.damage, false);
        break;
      case "survived":
        sfx("crit");
        this.cameras.main.flash(300, 200, 230, 255);
        for (const v of this.foeViews) this.tweens.add({ targets: [v.sprite, v.name, v.bar, v.barBg], alpha: 0, duration: 500 });
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

  /* The sprite for a battle key: "player", "ally", "ally2" or a monster's index. */
  spriteOf(key) {
    return key === "player" ? this.heroSprite : isAllyKey(key) ? this.allyViews[key].sprite : this.foeViews[key].sprite;
  }

  /* Rachel's key in this fight (Quill and COUNTER are hers). */
  rachelKey() { return allyKeys(this.battle).find(k => this.battle[k].id === "rachel") || "ally"; }

  /* A fallen companion gets back up. */
  revive(key) {
    const v = this.allyViews[key];
    this.tweens.add({ targets: [v.sprite, v.name], alpha: 1, duration: 300 });
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
    for (const [key, v] of Object.entries(this.allyViews)) {
      if (hp[key] === null || hp[key] === undefined) continue;
      v.bar.width = BAR_W * hp[key] / v.max;
      v.bar.fillColor = hpColour(hp[key], v.max);
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
    const ours = sprite === this.heroSprite || Object.values(this.allyViews).some(v => v.sprite === sprite);
    this.tweens.add({ targets: sprite, x: sprite.x + (ours ? -6 : 6), duration: 70, yoyo: true, delay: 90, ease: "Quad.out" });
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
    this.failedTrial = b.state === "won" && this.guardAlly && b.allyFell;
    if (b.state === "won") {
      if (this.winFlag && !this.failedTrial) state.flags[this.winFlag] = true;
      title = this.failedTrial ? "YOU WON, BUT..." : "VICTORY!"; color = COLORS.gold;
      playJingle(b.rewards.levelUps.length ? "levelUp" : "victory");
      lines.push(`+${b.rewards.xp} XP   +${b.rewards.gold} gold`);
      for (const l of b.rewards.levelUps) lines.push(`Level ${l.level}! +${l.hpGain} max HP${l.features.length ? `, ${l.features.join(", ")}` : ""}`);
      if (b.rewards.loot.length) lines.push(`Found: ${b.rewards.loot.join(", ")}`);
      if (this.failedTrial) lines.push(`${b.ally.name} fell: the trial isn't passed.`);
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
    const script = this.battle.state !== "won" ? null : this.failedTrial ? this.afterFail : this.afterWin;
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("World", { quiet, script }));
  }
}
