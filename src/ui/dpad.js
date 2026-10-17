// On-screen D-pad for phones. Hold a direction to keep walking; sliding your thumb across switches direction.
import { DIRS } from "../world/map.js";

const SIZE = 26, GAP = 2;
const ANGLE = { up: 0, right: 90, down: 180, left: 270 };

export class DPad {
  /* onPress(dir) is called on every press, so a quick tap still counts as a step. */
  constructor(scene, x, y, onPress = () => {}) {
    this.dir = null;
    scene.input.addPointer(2); // walk with one thumb while tapping with the other
    for (const [dir, { dx, dy }] of Object.entries(DIRS)) {
      const bx = x + dx * (SIZE + GAP), by = y + dy * (SIZE + GAP);
      const pad = scene.add.rectangle(bx, by, SIZE, SIZE, 0x000000, 0.35).setStrokeStyle(1, 0xffffff, 0.35)
        .setScrollFactor(0).setDepth(100).setInteractive();
      scene.add.triangle(bx, by, 0, 8, 10, 8, 5, 0, 0xffffff, 0.7).setAngle(ANGLE[dir]).setScrollFactor(0).setDepth(101);
      pad.on("pointerdown", () => { this.dir = dir; onPress(dir); });
      pad.on("pointerover", pointer => { if (pointer.isDown) this.dir = dir; });
      pad.on("pointerout", () => { if (this.dir === dir) this.dir = null; });
    }
    scene.input.on("pointerup", () => { this.dir = null; });
  }
}

export function wantsTouchControls(scene) {
  return scene.sys.game.device.input.touch || new URLSearchParams(location.search).has("touch");
}
