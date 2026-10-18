// The layer over the world: HP, gold and quest line, the BAG / MENU / sound buttons, area banners and notes,
// and the joystick. It runs alongside World and is drawn on the menu grid, so it stays crisp while the camera moves.
import { WIDTH, FONT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { objective } from "../story/scripts.js";
import { uiCamera, button } from "../ui/widgets.js";
import { Joystick } from "../ui/joystick.js";
import { isMuted, toggleMuted, sfx } from "../audio/sound.js";

export const wantsTouchControls = scene =>
  scene.sys.game.device.input.touch || new URLSearchParams(location.search).has("touch");

export class Hud extends Phaser.Scene {
  constructor() { super("Hud"); }

  create() {
    uiCamera(this);
    this.lastGoal = null;
    const world = () => this.scene.get("World");

    this.add.rectangle(4, 4, 160, 18, COLORS.panel, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.panelEdge);
    this.stats = this.add.text(10, 9, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.text });
    this.quest = this.add.text(6, 27, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.gold, stroke: "#000000", strokeThickness: 3 });

    button(this, WIDTH - 30, 13, 52, 18, "MENU", () => world().toTitle());
    button(this, WIDTH - 84, 13, 48, 18, "BAG", () => world().openOverlay("Inventory"));
    this.sound = button(this, WIDTH - 134, 13, 44, 18, "", () => { toggleMuted(); this.showSound(); sfx("select"); });
    this.showSound();

    this.bannerText = this.add.text(WIDTH / 2, 52, "", { fontFamily: FONT, fontSize: "10px", color: COLORS.gold, stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5).setAlpha(0);
    this.noteText = this.add.text(WIDTH / 2, 250, "", {
      fontFamily: FONT, fontSize: "8px", color: COLORS.text, backgroundColor: "#000000aa", padding: { x: 6, y: 4 }, align: "center", wordWrap: { width: 300 },
    }).setOrigin(0.5).setAlpha(0);

    this.joystick = new Joystick(this, { showHint: wantsTouchControls(this) });
    this.refresh();
    world().hudReady?.(this);
  }

  showSound() { this.sound.setLabel(isMuted() ? "MUTE" : "SND"); }

  refresh() {
    const h = state.hero;
    this.stats.setText(`LV ${h.level} HP ${h.hp}/${h.maxHp} ${h.gold}G`);
    const goal = objective(state.flags);
    this.quest.setText(goal ? `QUEST: ${goal}` : "");
    // The quest line just went blank: the Elder has paid up.
    if (this.lastGoal && !goal) this.banner("QUEST COMPLETE!", 2500);
    this.lastGoal = goal;
  }

  banner(message, ms = 1800) { this.flash(this.bannerText, message, ms); }
  note(message, ms = 2200) { this.flash(this.noteText, message, ms); }

  flash(text, message, ms) {
    this.tweens.killTweensOf(text);
    text.setText(message).setAlpha(1);
    this.tweens.add({ targets: text, alpha: 0, delay: ms, duration: 500 });
  }
}
