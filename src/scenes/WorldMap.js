// The world map, opened over the world (the MAP button or M). The overworld is drawn small, one block per tile, with
// the parts you haven't been to yet under fog; a blinking marker shows where you are (or the door you went in by).
// On the right, the places you've found: tap one to fast-travel there. That works from anywhere out in the open.
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { MAPS } from "../world/maps.js";
import { zoneAt, tileAt } from "../world/map.js";
import { tileOf } from "../world/movement.js";
import { zoneSeen, travelPoints, canFastTravel } from "../world/travel.js";
import { MAP_COLOURS } from "../art/tiles.js";
import { text, panel, button, uiCamera } from "../ui/widgets.js";
import { sfx } from "../audio/sound.js";

const SCALE = 3.5; // menu-grid units per tile (7 canvas pixels, so the blocks stay crisp)
const MAP_X = 10, MAP_Y = 30;
const FOG = "#24233a";

/* Where you are on the overworld: your tile, or, inside a house or underground, the way you went in. */
function whereOnOverworld() {
  if (state.map === "overworld") return tileOf(state.pos);
  const door = MAPS.overworld.doors.find(d => d.to === state.map);
  if (door) return { x: door.x, y: door.y };
  return { x: 52, y: 29 }; // the goblin cave
}

export class WorldMap extends Phaser.Scene {
  constructor() { super("WorldMap"); }

  create() {
    uiCamera(this);
    const world = MAPS.overworld;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    text(this, 10, 9, "MAP", { color: COLORS.gold });
    button(this, WIDTH - 34, 13, 56, 18, "CLOSE", () => this.close());
    for (const k of ["ESC", "M"]) this.input.keyboard.on(`keydown-${k}`, () => this.close());

    // The map: one pixel per tile in a small texture, shown big. Remade each time, as the fog lifts.
    if (this.textures.exists("worldmap")) this.textures.remove("worldmap");
    const tex = this.textures.createCanvas("worldmap", world.width, world.height), ctx = tex.getContext();
    for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
      const zone = zoneAt(world, x, y);
      ctx.fillStyle = zone && !zoneSeen(state.flags, zone.id) ? FOG : MAP_COLOURS[tileAt(world, x, y).name] || COLORS.text;
      ctx.fillRect(x, y, 1, 1);
    }
    tex.refresh();
    const w = world.width * SCALE, h = world.height * SCALE;
    this.add.rectangle(MAP_X - 2, MAP_Y - 2, w + 4, h + 4, COLORS.panelEdge).setOrigin(0);
    this.add.image(MAP_X, MAP_Y, "worldmap").setOrigin(0).setScale(SCALE);
    const at = (x, y) => [MAP_X + (x + 0.5) * SCALE, MAP_Y + (y + 0.5) * SCALE];
    for (const z of world.zones) {
      if (!zoneSeen(state.flags, z.id)) continue;
      const [cx, cy] = at((z.x0 + z.x1) / 2, z.y0 + 1);
      text(this, cx, cy, z.name.toUpperCase(), { color: COLORS.text, stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5, 0);
    }

    // Fast travel.
    const px = MAP_X + w + 12, pw = WIDTH - px - 6;
    panel(this, px, MAP_Y - 2, pw, h + 4);
    text(this, px + 8, MAP_Y + 6, "FAST TRAVEL", { color: COLORS.gold });
    const open = canFastTravel(state);
    const points = travelPoints(state.flags);
    points.forEach((p, i) => {
      const b = button(this, px + pw / 2, MAP_Y + 34 + i * 26, pw - 16, 20, p.found ? p.name.toUpperCase() : "???", () => this.go(p));
      b.setEnabled(open && p.found);
      if (p.found) {
        const [tx, ty] = at(p.at.x, p.at.y);
        this.add.rectangle(tx, ty, 4, 4, 0xffffff).setStrokeStyle(1, 0x000000);
      }
    });
    const found = points.filter(p => p.found).length;
    const note = !open ? "Step outside to travel."
      : found < points.length ? "Find more places to travel to them. White squares are places you can go."
        : "White squares are places you can go.";
    text(this, px + 8, MAP_Y + 34 + points.length * 26, note, { color: COLORS.dim, wordWrap: { width: pw - 16 }, lineSpacing: 4 });

    // You are here (on top of everything).
    const me = whereOnOverworld();
    const [mx, my] = at(me.x, me.y);
    const marker = this.add.rectangle(mx, my, 6, 6, 0xe8b923).setStrokeStyle(1, 0x000000);
    this.tweens.add({ targets: marker, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
  }

  /* Closes the map and has the world take you there. */
  go(point) {
    sfx("select");
    this.scene.get("World").pendingTravel = { map: "overworld", at: point.at };
    this.close();
  }

  close() {
    this.scene.stop();
    this.scene.resume("World");
  }
}
