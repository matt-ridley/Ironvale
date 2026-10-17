// Title screen. For now it also shows off the rules engine: roll a check, run a test fight, rest.
import { TITLE, VERSION, WIDTH, HEIGHT, FONT, COLORS } from "../config.js";
import { createCharacter, armourClass, weaponAttack, xpToNextLevel } from "../rules/character.js";
import { abilityCheck, describeCheck } from "../rules/checks.js";
import { createBattle, playerAction } from "../rules/combat.js";
import { itemName } from "../rules/items.js";

const CHECKS = [
  { ability: "STR", dc: 12, what: "Shove the fallen log" },
  { ability: "DEX", dc: 14, what: "Climb the cave wall" },
  { ability: "CON", dc: 10, what: "Drink the swamp water" },
];
const FOES = [["giantRat"], ["goblin"], ["wolf"], ["goblin", "giantRat"]];
const LINE_MS = 450;

export class Title extends Phaser.Scene {
  constructor() { super("Title"); }

  create() {
    this.hero = createCharacter();
    this.busy = false;

    this.drawBackdrop();
    this.add.text(WIDTH / 2, 12, TITLE.toUpperCase(), { fontFamily: FONT, fontSize: "24px", color: COLORS.gold }).setOrigin(0.5, 0);
    this.add.text(WIDTH / 2, 40, "A d20 pixel adventure", { fontFamily: FONT, fontSize: "8px", color: COLORS.dim }).setOrigin(0.5, 0);

    this.knight = this.add.image(120, 126, "knight").setScale(3);
    this.goblin = this.add.image(360, 126, "goblin").setScale(3).setFlipX(true);
    this.tweens.add({ targets: [this.knight, this.goblin], y: "-=3", duration: 600, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    this.sheet = this.add.text(WIDTH / 2, 58, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.text, align: "center", lineSpacing: 6 }).setOrigin(0.5, 0);

    this.button(WIDTH / 2 - 130, 182, "ROLL CHECK", () => this.rollCheck());
    this.button(WIDTH / 2, 182, "TEST FIGHT", () => this.testFight());
    this.restButton = this.button(WIDTH / 2 + 130, 182, "REST", () => this.rest());

    this.add.rectangle(WIDTH / 2, 228, WIDTH - 16, 54, COLORS.panel).setStrokeStyle(1, COLORS.panelEdge);
    this.logText = this.add.text(16, 205, "Tap a button to roll some dice.", {
      fontFamily: FONT, fontSize: "8px", color: COLORS.text, lineSpacing: 5, wordWrap: { width: WIDTH - 32 },
    });

    this.add.text(WIDTH - 6, HEIGHT - 2, `v${VERSION}`, { fontFamily: FONT, fontSize: "8px", color: COLORS.dim }).setOrigin(1, 1);
    this.refreshSheet();
  }

  drawBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.bg).fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(COLORS.ground).fillRect(0, 140, WIDTH, 30);
    g.fillStyle(COLORS.groundDark);
    for (let x = 0; x < WIDTH; x += 16) g.fillRect(x + ((x / 16) % 2) * 8, 144 + ((x / 16) % 3) * 7, 4, 2);
  }

  button(x, y, label, onTap) {
    const bg = this.add.rectangle(x, y, 118, 22, COLORS.panel).setStrokeStyle(1, COLORS.panelEdge).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontFamily: FONT, fontSize: "8px", color: COLORS.text }).setOrigin(0.5);
    bg.on("pointerover", () => bg.setFillStyle(COLORS.panelEdge));
    bg.on("pointerout", () => bg.setFillStyle(COLORS.panel));
    bg.on("pointerup", () => { if (!this.busy) onTap(); });
    return { bg, text };
  }

  refreshSheet() {
    const h = this.hero, atk = weaponAttack(h), dead = h.hp <= 0;
    const dmg = atk.damageBonus ? `${atk.damage}${atk.damageBonus > 0 ? "+" : ""}${atk.damageBonus}` : atk.damage;
    const potions = h.inventory.filter(i => i.base === "potionHealing").length;
    this.sheet.setText([
      `${h.name}  LV ${h.level}  HP ${h.hp}/${h.maxHp}  AC ${armourClass(h)}`,
      `${itemName(h.equipment.weapon)} +${atk.bonus} (${dmg})  ${h.gold} gold  ${potions} potions`,
      `XP ${h.xp}  (${xpToNextLevel(h)} to next level)`,
    ].join("\n"));
    this.sheet.setColor(dead ? COLORS.bad : COLORS.text);
    this.restButton.text.setText(dead ? "NEW HERO" : "REST");
    this.knight.setAlpha(dead ? 0.35 : 1).setAngle(dead ? 90 : 0);
  }

  /* Shows the newest lines that fit the panel. Long lines wrap, so count rows after wrapping. */
  showLines(lines, color = COLORS.text) {
    const rows = this.logText.setColor(color).getWrappedText(lines.join("\n"));
    this.logText.setText(rows.slice(-4));
  }

  rollCheck() {
    if (this.hero.hp <= 0) return this.showLines(["You can't do much while knocked out. Tap NEW HERO."], COLORS.bad);
    const c = Phaser.Utils.Array.GetRandom(CHECKS);
    const r = abilityCheck(this.hero, c.ability, c.dc);
    this.showLines([`${c.what}...`, describeCheck(r)], r.success ? COLORS.good : COLORS.bad);
  }

  /* Plays a whole fight with a simple autopilot, then reveals the log a line at a time. */
  testFight() {
    if (this.hero.hp <= 0) return this.showLines(["You can't fight while knocked out. Tap NEW HERO."], COLORS.bad);
    const battle = createBattle(this.hero, Phaser.Utils.Array.GetRandom(FOES));
    for (let i = 0; i < 100 && battle.state === "active"; i++) {
      const h = this.hero, hasPotion = h.inventory.some(it => it.base === "potionHealing");
      playerAction(battle, h.hp <= h.maxHp / 3 && hasPotion ? { type: "potion" } : { type: "attack" });
    }
    this.busy = true;
    const shown = [];
    battle.log.forEach((entry, i) => this.time.delayedCall(i * LINE_MS, () => {
      shown.push(entry.text);
      const color = entry.type === "won" || entry.type === "level-up" ? COLORS.good : entry.type === "lost" ? COLORS.bad : COLORS.text;
      this.showLines(shown, color);
      if (entry.roll?.hit) this.flash(entry.type === "monster-attack" ? this.knight : this.goblin);
    }));
    this.time.delayedCall(battle.log.length * LINE_MS, () => { this.busy = false; this.refreshSheet(); });
  }

  flash(target) {
    target.setTintFill(0xffffff);
    this.time.delayedCall(90, () => target.clearTint());
  }

  rest() {
    if (this.hero.hp <= 0) {
      this.hero = createCharacter();
      this.showLines(["A new hero sets out from the village."]);
    } else {
      this.hero.hp = this.hero.maxHp;
      this.showLines(["You rest by the fire and recover all your HP."], COLORS.good);
    }
    this.refreshSheet();
  }
}
