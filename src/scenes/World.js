// The overworld: walk tile by tile with the arrow keys, WASD or the on-screen D-pad. The camera follows the hero.
import { WIDTH, FONT, COLORS } from "../config.js";
import { createMap, frameGrid, step, zoneAt, tileAt } from "../world/map.js";
import { OVERWORLD } from "../world/overworld.js";
import { TILE } from "../art/tiles.js";
import { state } from "../state/game.js";
import { DPad, wantsTouchControls } from "../ui/dpad.js";

const STEP_MS = 150;
const MAPS = { [OVERWORLD.name]: createMap(OVERWORLD) };
const KEYS = { up: ["UP", "W"], down: ["DOWN", "S"], left: ["LEFT", "A"], right: ["RIGHT", "D"] };
const centre = n => n * TILE + TILE / 2;

export class World extends Phaser.Scene {
  constructor() { super("World"); }

  create() {
    this.map = MAPS[state.map];
    this.moving = false;
    this.zoneId = null;

    const tilemap = this.make.tilemap({ data: frameGrid(this.map), tileWidth: TILE, tileHeight: TILE });
    tilemap.createLayer(0, tilemap.addTilesetImage("tiles"), 0, 0);

    this.player = this.add.image(centre(state.pos.x), centre(state.pos.y), "knight").setDepth(10);
    this.face(state.facing);
    this.cameras.main.setBounds(0, 0, this.map.width * TILE, this.map.height * TILE).startFollow(this.player, true);

    this.keys = Object.fromEntries(Object.entries(KEYS).map(([dir, names]) => [dir, names.map(n => this.input.keyboard.addKey(n))]));
    // A tap can go down and up between two frames, so remember it as well as checking what is held.
    this.tapped = null;
    for (const [dir, keys] of Object.entries(this.keys)) for (const k of keys) k.on("down", () => { this.tapped = dir; });
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Title"));
    this.dpad = wantsTouchControls(this) ? new DPad(this, 48, 222, dir => { this.tapped = dir; }) : null;

    this.drawHud();
    this.arrived();
  }

  drawHud() {
    const fixed = o => o.setScrollFactor(0).setDepth(100);
    fixed(this.add.rectangle(4, 4, 112, 18, COLORS.panel, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.panelEdge));
    this.hud = fixed(this.add.text(10, 9, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.text }));
    const menu = fixed(this.add.rectangle(WIDTH - 4, 4, 52, 18, COLORS.panel, 0.85).setOrigin(1, 0).setStrokeStyle(1, COLORS.panelEdge).setInteractive({ useHandCursor: true }));
    fixed(this.add.text(WIDTH - 30, 13, "MENU", { fontFamily: FONT, fontSize: "8px", color: COLORS.text }).setOrigin(0.5));
    menu.on("pointerup", () => this.scene.start("Title"));
    this.banner = fixed(this.add.text(WIDTH / 2, 34, "", { fontFamily: FONT, fontSize: "10px", color: COLORS.gold, stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5).setAlpha(0));
    this.note = fixed(this.add.text(WIDTH / 2, 250, "", {
      fontFamily: FONT, fontSize: "8px", color: COLORS.text, backgroundColor: "#000000aa", padding: { x: 6, y: 4 }, align: "center", wordWrap: { width: 300 },
    }).setOrigin(0.5).setAlpha(0));
    this.refreshHud();
  }

  refreshHud() {
    const h = state.hero;
    this.hud.setText(`LV ${h.level} HP ${h.hp}/${h.maxHp}`);
  }

  heldDir() {
    for (const [dir, keys] of Object.entries(this.keys)) if (keys.some(k => k.isDown)) return dir;
    return this.dpad?.dir || null;
  }

  face(dir) {
    state.facing = dir;
    if (dir === "left") this.player.setFlipX(true);
    if (dir === "right") this.player.setFlipX(false);
  }

  update() {
    if (this.moving) return;
    const dir = this.heldDir() || this.tapped;
    this.tapped = null;
    if (!dir) return;
    this.face(dir);
    const next = step(this.map, state.pos, dir);
    if (!next.moved) return;
    this.moving = true;
    state.pos = { x: next.x, y: next.y };
    this.tweens.add({
      targets: this.player, x: centre(next.x), y: centre(next.y), duration: STEP_MS,
      onComplete: () => { this.moving = false; this.arrived(); },
    });
    this.tweens.add({ targets: this.player, scaleY: 0.88, duration: STEP_MS / 2, yoyo: true });
  }

  /* Runs after each step (and on entering the scene): area names and things underfoot. */
  arrived() {
    const { x, y } = state.pos;
    const zone = zoneAt(this.map, x, y);
    if (zone && zone.id !== this.zoneId) {
      this.zoneId = zone.id;
      this.flash(this.banner, zone.name, 1800);
    }
    if (tileAt(this.map, x, y).name === "cave") this.flash(this.note, "Cold air drifts from the cave. Something moves inside... (coming soon)", 2500);
  }

  flash(text, message, ms) {
    this.tweens.killTweensOf(text);
    text.setText(message).setAlpha(1);
    this.tweens.add({ targets: text, alpha: 0, delay: ms, duration: 500 });
  }
}
