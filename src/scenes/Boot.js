// First scene: builds the textures the game needs, then moves on to the title screen.
import { makeAllTextures } from "../art/pixels.js";

export class Boot extends Phaser.Scene {
  constructor() { super("Boot"); }

  create() {
    makeAllTextures(this);
    this.scene.start("Title");
  }
}
