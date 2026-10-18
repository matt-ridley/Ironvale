// A floating thumbstick: touch anywhere in the left part of the screen and the stick appears under your thumb.
// Drag to move: a little to walk, all the way to run. Let go and it disappears.
// The current direction is in `stick` ({ x, y }, length up to 1), which the World scene reads every frame.
import { WIDTH, HEIGHT } from "../config.js";

export const stick = { x: 0, y: 0 };

const RADIUS = 30;

export class Joystick {
  /* `area(p)` says whether a touch at p (menu coordinates) may start the stick. */
  constructor(scene, { area = p => p.x < WIDTH * 0.6 && p.y > 40, showHint = false } = {}) {
    this.scene = scene;
    this.id = null;
    this.home = { x: 64, y: HEIGHT - 64 };
    this.base = scene.add.circle(this.home.x, this.home.y, RADIUS, 0x000000, 0.28).setStrokeStyle(2, 0xffffff, 0.35).setDepth(50);
    this.knob = scene.add.circle(this.home.x, this.home.y, RADIUS * 0.45, 0xffffff, 0.4).setDepth(51);
    this.showHint = showHint;
    this.rest();
    scene.input.addPointer(2); // a second finger can tap buttons while steering
    scene.input.on("pointerdown", (pointer, over) => {
      if (this.id !== null || over.length) return;
      const p = this.point(pointer);
      if (!area(p)) return;
      this.id = pointer.id;
      this.centre = p;
      this.base.setPosition(p.x, p.y).setAlpha(1).setVisible(true);
      this.knob.setPosition(p.x, p.y).setAlpha(1).setVisible(true);
    });
    scene.input.on("pointermove", pointer => { if (pointer.id === this.id) this.drag(this.point(pointer)); });
    const up = pointer => { if (pointer.id === this.id) this.release(); };
    scene.input.on("pointerup", up);
    scene.input.on("pointerupoutside", up);
    scene.events.on("pause", () => this.release());
    scene.events.once("shutdown", () => this.release());
  }

  point(pointer) { return this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y); }

  drag(p) {
    let dx = p.x - this.centre.x, dy = p.y - this.centre.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx *= RADIUS / len; dy *= RADIUS / len; }
    this.knob.setPosition(this.centre.x + dx, this.centre.y + dy);
    stick.x = dx / RADIUS;
    stick.y = dy / RADIUS;
  }

  release() {
    this.id = null;
    stick.x = 0; stick.y = 0;
    this.rest();
  }

  /* At rest, a faint stick sits bottom left on touch screens so players know it's there. */
  rest() {
    const show = this.showHint;
    this.base.setPosition(this.home.x, this.home.y).setVisible(show).setAlpha(0.35);
    this.knob.setPosition(this.home.x, this.home.y).setVisible(show).setAlpha(0.35);
  }
}
