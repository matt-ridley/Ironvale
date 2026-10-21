// Title screen: CONTINUE your saved hero, or start a NEW GAME (with a check first if that would replace a save), which
// asks for the hero's name first (the NameEntry screen starts the game).
import { TITLE, VERSION, WIDTH, HEIGHT, FONT, COLORS } from "../config.js";
import { armourClass } from "../rules/character.js";
import { state } from "../state/game.js";
import { loadGame } from "../state/save.js";
import { objective } from "../story/scripts.js";
import { text, panel, button, uiCamera } from "../ui/widgets.js";
import { heroFrame, paintHero } from "../art/pixels.js";
import { playMusic, isMuted, toggleMuted, sfx } from "../audio/sound.js";
import { MONSTER_SCALE } from "../art/monsters.js";

export class Title extends Phaser.Scene {
  constructor() { super("Title"); }

  create() {
    uiCamera(this);
    this.confirming = null;
    this.drawBackdrop();
    this.add.text(WIDTH / 2, 18, TITLE.toUpperCase(), { fontFamily: FONT, fontSize: "24px", color: COLORS.gold }).setOrigin(0.5, 0);
    text(this, WIDTH / 2, 45, "A d20 pixel adventure", { color: COLORS.dim }).setOrigin(0.5, 0);

    paintHero(this, state.hero.oath);
    const knight = this.add.image(120, 152, "hero", heroFrame("side")).setOrigin(0.5, 1).setScale(1.5);
    const goblin = this.add.image(360, 152, "goblin").setOrigin(0.5, 1).setScale(MONSTER_SCALE).setFlipX(true);
    this.tweens.add({ targets: [knight, goblin], y: "-=3", duration: 600, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    // The live state is the saved game (restored at start-up, and saved as you play).
    const saved = loadGame() !== null;
    const h = state.hero;
    const goal = objective(state.flags);
    text(this, WIDTH / 2, 58, saved
      ? `${h.name.toUpperCase()}  LV ${h.level}  HP ${h.hp}/${h.maxHp}  AC ${armourClass(h)}  ${h.gold} GOLD\n${goal ? `QUEST: ${goal}` : "QUEST COMPLETE. The wood is yours to explore."}`
      : "Goblins are raiding Oakhollow.\nThe village needs a hero.", { align: "center", lineSpacing: 6 }).setOrigin(0.5, 0);

    if (saved) {
      this.primary = button(this, WIDTH / 2 - 64, 186, 116, 24, "CONTINUE", () => this.play());
      button(this, WIDTH / 2 + 64, 186, 116, 24, "NEW GAME", () => this.confirmNew());
    } else {
      this.primary = button(this, WIDTH / 2, 186, 140, 24, "NEW GAME", () => this.startNew());
    }
    this.input.keyboard.on("keydown-ENTER", () => { if (!this.confirming) this.primary.bg.emit("pointerup"); });

    text(this, WIDTH / 2, 214, "Your progress saves automatically.", { color: COLORS.dim }).setOrigin(0.5, 0);
    text(this, 6, HEIGHT - 2, "Rules: SRD 5.1, CC-BY-4.0", { color: COLORS.dim }).setOrigin(0, 1);
    text(this, WIDTH - 6, HEIGHT - 2, `v${VERSION}`, { color: COLORS.dim }).setOrigin(1, 1);
    const snd = button(this, WIDTH - 30, 14, 48, 18, isMuted() ? "MUTE" : "SND", () => { toggleMuted(); snd.setLabel(isMuted() ? "MUTE" : "SND"); sfx("select"); });
    playMusic("village"); // starts on the first tap or key press
  }

  drawBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(COLORS.bg).fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(COLORS.ground).fillRect(0, 140, WIDTH, 30);
    g.fillStyle(COLORS.groundDark);
    for (let x = 0; x < WIDTH; x += 16) g.fillRect(x + ((x / 16) % 2) * 8, 144 + ((x / 16) % 3) * 7, 4, 2);
  }

  play() {
    this.cameras.main.fadeOut(200);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("World"));
  }

  startNew() {
    this.scene.start("NameEntry", { mode: "new" }); // which replaces the save once you're named
  }

  /* Starting over would replace the saved hero, so ask first. */
  confirmNew() {
    if (this.confirming) return;
    const parts = [
      this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.6).setOrigin(0).setInteractive(),
      panel(this, WIDTH / 2 - 150, 80, 300, 100),
      text(this, WIDTH / 2, 96, "Start a new game?\nYour saved hero will be lost.", { align: "center", lineSpacing: 6 }).setOrigin(0.5, 0),
    ];
    const close = () => { for (const p of [...parts, ...yes, ...no]) p.destroy(); this.confirming = null; };
    const y = button(this, WIDTH / 2 - 60, 156, 100, 22, "START OVER", () => { close(); this.startNew(); });
    const n = button(this, WIDTH / 2 + 60, 156, 100, 22, "KEEP HERO", close);
    const yes = [y.bg, y.text], no = [n.bg, n.text];
    this.confirming = close;
    this.input.keyboard.once("keydown-ESC", () => this.confirming?.());
  }
}
