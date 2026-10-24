// The layer over the world: HP, gold and quest line, the MAP / QUESTS / BAG / MENU / sound buttons, area banners and notes,
// and the joystick. It runs alongside World and is drawn on the menu grid, so it stays crisp while the camera moves.
import { WIDTH, FONT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { objective, sideObjective, questsDone } from "../story/scripts.js";
import { uiCamera, button } from "../ui/widgets.js";
import { Joystick } from "../ui/joystick.js";
import { isMuted, toggleMuted, sfx } from "../audio/sound.js";

export const wantsTouchControls = scene =>
  scene.sys.game.device.input.touch || new URLSearchParams(location.search).has("touch");

export class Hud extends Phaser.Scene {
  constructor() { super("Hud"); }

  create() {
    uiCamera(this);
    this.lastDone = questsDone(state.flags);
    const world = () => this.scene.get("World");

    this.add.rectangle(4, 4, 160, 18, COLORS.panel, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.panelEdge);
    this.stats = this.add.text(10, 9, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.text });
    this.quest = this.add.text(6, 27, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.gold, stroke: "#000000", strokeThickness: 3 });
    this.side = this.add.text(6, 40, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.text, stroke: "#000000", strokeThickness: 3 });
    this.effects = this.add.text(6, 53, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.good, stroke: "#000000", strokeThickness: 3 });

    button(this, WIDTH - 30, 13, 52, 18, "MENU", () => world().toTitle());
    button(this, WIDTH - 84, 13, 48, 18, "BAG", () => world().openOverlay("Inventory"));
    this.sound = button(this, WIDTH - 134, 13, 44, 18, "", () => { toggleMuted(); this.showSound(); sfx("select"); });
    button(this, WIDTH - 192, 13, 64, 18, "QUESTS", () => world().openOverlay("Quests"));
    button(this, WIDTH - 244, 13, 36, 18, "MAP", () => world().openOverlay("WorldMap"));
    this.showSound();

    this.bannerText = this.add.text(WIDTH / 2, 76, "", { fontFamily: FONT, fontSize: "10px", color: COLORS.gold, stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5).setAlpha(0);
    this.noteText = this.add.text(WIDTH / 2, 250, "", {
      fontFamily: FONT, fontSize: "8px", color: COLORS.text, backgroundColor: "#000000aa", padding: { x: 6, y: 4 }, align: "center", wordWrap: { width: 300 },
    }).setOrigin(0.5).setAlpha(0);

    this.joystick = new Joystick(this, { showHint: wantsTouchControls(this) });
    this.refresh();
    // A menu, shop, bank or conversation may have changed your gold, HP or quests while this was paused. (Phaser
    // resumes a scene on the next frame, so World can't refresh it on the spot.) Scene events outlive a restart, so
    // swap the listener rather than adding another.
    this.events.off("resume", this.refresh, this);
    this.events.on("resume", this.refresh, this);
    world().hudReady?.(this);
  }

  showSound() { this.sound.setLabel(isMuted() ? "MUTE" : "SND"); }

  refresh() {
    const h = state.hero;
    this.stats.setText(`LV ${h.level} HP ${h.hp}/${h.maxHp} ${h.gold}G`);
    const goal = objective(state.flags);
    this.quest.setText(goal ? `QUEST: ${goal}` : "");
    const side = sideObjective(state.flags, state);
    this.side.setText(side ? `ALSO: ${side}` : "");
    this.effects.setY(side ? 53 : 40);
    const fx = h.effects || {};
    this.effects.setText([fx.speed > 0 ? `SPEED ${fx.speed}` : "", fx.dexterity ? "DEX READY" : "", fx.fireResist ? "FIRE-PROOF" : ""].filter(Boolean).join("  "));
    // The Elder has just paid for a quest.
    const done = questsDone(state.flags);
    if (done > this.lastDone) this.banner("QUEST COMPLETE!", 2500);
    this.lastDone = done;
  }

  banner(message, ms = 1800) { this.flash(this.bannerText, message, ms); }
  note(message, ms = 2200) { this.flash(this.noteText, message, ms); }

  flash(text, message, ms) {
    this.tweens.killTweensOf(text);
    text.setText(message).setAlpha(1);
    this.tweens.add({ targets: text, alpha: 0, delay: ms, duration: 500 });
  }
}
