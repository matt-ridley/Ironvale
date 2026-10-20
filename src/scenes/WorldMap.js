// The world map, opened over the world (the MAP button or M). Tabs along the top pick a region (travel.js REGIONS).
// A region you can reach is drawn small, one block per tile, with the parts you haven't been to yet under fog and a
// blinking marker where you are (or the door you went in by). A region that isn't open yet is a dark shape marked ???,
// with a hint. On the right, the places you've found: tap one to fast-travel there. That works only from a safe
// place: standing in a town (or one of its houses) or at a camp.
import { WIDTH, HEIGHT, COLORS, FONT } from "../config.js";
import { state } from "../state/game.js";
import { MAPS } from "../world/maps.js";
import { zoneAt, tileAt } from "../world/map.js";
import { tileOf } from "../world/movement.js";
import { zoneSeen, travelPoints, canFastTravel, REGIONS, regionOpen, regionOf } from "../world/travel.js";
import { MAP_COLOURS } from "../art/tiles.js";
import { text, panel, button, uiCamera } from "../ui/widgets.js";
import { sfx } from "../audio/sound.js";

const SCALE = 3.5; // menu-grid units per tile (7 canvas pixels, so the blocks stay crisp)
const MAP_X = 10, MAP_Y = 30;
const MAP_W = 64 * SCALE, MAP_H = 62 * SCALE; // the Vale's size; a locked region's shape fills the same frame
const FOG = "#24233a", SHADOW = 0x24233a;

/* Where you are on a region's map: your tile, or, inside a house or underground, the way you went in. */
function whereOn(region) {
  const map = MAPS[region.map];
  if (state.map === map.name) return tileOf(state.pos);
  const door = map.doors.find(d => d.to === state.map);
  if (door) return { x: door.x, y: door.y };
  return { x: 52, y: 29 }; // the goblin cave
}

/* A locked region's dark shape, so you can see the world is bigger than you can reach yet. */
function drawShape(scene, shape) {
  const g = scene.add.graphics().fillStyle(SHADOW);
  const x0 = MAP_X, y0 = MAP_Y, w = MAP_W, h = MAP_H;
  if (shape === "keep") {
    for (let i = 0; i < 7; i++) g.fillEllipse(x0 + 24 + i * 29, y0 + h - 30 + (i % 2) * 10, 40, 18); // the fen
    g.fillRect(x0 + 62, y0 + 92, 100, 70); // the walls
    for (const tx of [52, 100, 148]) g.fillRect(x0 + tx, y0 + 62, 24, 100); // towers
    for (let cx = 52; cx < 172; cx += 12) g.fillRect(x0 + cx, y0 + 56, 7, 8); // battlements
  } else if (shape === "mountains") {
    for (const [cx, top, half] of [[40, 90, 50], [110, 40, 70], [180, 80, 55]]) g.fillTriangle(x0 + cx - half, y0 + h - 20, x0 + cx, y0 + top, x0 + cx + half, y0 + h - 20);
  } else {
    g.fillRect(x0, y0 + 40, w, h - 40); // a cliff face, and a great door in it
    g.fillStyle(COLORS.bg).fillRect(x0 + w / 2 - 36, y0 + 110, 72, h - 130).fillCircle(x0 + w / 2, y0 + 110, 36);
  }
}

export class WorldMap extends Phaser.Scene {
  constructor() { super("WorldMap"); }

  /* data.region: which region's page to show (the one you're in, if not given). */
  create(data = {}) {
    uiCamera(this);
    const here = regionOf(state.map);
    const region = REGIONS.find(r => r.id === data.region) || here;
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    text(this, 10, 9, "MAP", { color: COLORS.gold });
    button(this, WIDTH - 34, 13, 56, 18, "CLOSE", () => this.close());
    for (const k of ["ESC", "M"]) this.input.keyboard.on(`keydown-${k}`, () => this.close());
    REGIONS.forEach((r, i) => {
      const tab = button(this, 82 + i * 76, 13, 70, 18, regionOpen(r, state.flags) ? r.tab : "???", () => { sfx("select"); this.scene.restart({ region: r.id }); });
      tab.setActive(r === region);
    });

    this.add.rectangle(MAP_X - 2, MAP_Y - 2, MAP_W + 4, MAP_H + 4, COLORS.panelEdge).setOrigin(0);
    if (regionOpen(region, state.flags)) this.drawRegion(region, region === here);
    else {
      this.add.rectangle(MAP_X, MAP_Y, MAP_W, MAP_H, COLORS.bg).setOrigin(0);
      drawShape(this, region.shape);
      this.add.text(MAP_X + MAP_W / 2, MAP_Y + 36, "???", { fontFamily: FONT, fontSize: "24px", color: COLORS.dim }).setOrigin(0.5);
      text(this, MAP_X + 8, MAP_Y + MAP_H - 30, region.hint(state.flags), { color: COLORS.text, wordWrap: { width: MAP_W - 16 }, lineSpacing: 4, stroke: "#000000", strokeThickness: 3 });
    }
    this.drawTravel();
  }

  /* An open region: its map, fogged where you haven't been, with the places to travel to and you. */
  drawRegion(region, youreHere) {
    const world = MAPS[region.map];
    // The map: one pixel per tile in a small texture, shown big. Remade each time, as the fog lifts.
    if (this.textures.exists("worldmap")) this.textures.remove("worldmap");
    const tex = this.textures.createCanvas("worldmap", world.width, world.height), ctx = tex.getContext();
    for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
      const zone = zoneAt(world, x, y);
      ctx.fillStyle = zone && !zoneSeen(state.flags, zone.id) ? FOG : MAP_COLOURS[tileAt(world, x, y).name] || COLORS.text;
      ctx.fillRect(x, y, 1, 1);
    }
    tex.refresh();
    this.add.image(MAP_X, MAP_Y, "worldmap").setOrigin(0).setScale(SCALE);
    const at = (x, y) => [MAP_X + (x + 0.5) * SCALE, MAP_Y + (y + 0.5) * SCALE];
    for (const z of world.zones) {
      if (!zoneSeen(state.flags, z.id)) continue;
      const [cx, cy] = at((z.x0 + z.x1) / 2, z.y0 + 1);
      text(this, cx, cy, z.name.toUpperCase(), { color: COLORS.text, stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5, 0);
    }
    for (const p of travelPoints(state.flags).filter(p => p.found && p.map === world.name)) {
      const [tx, ty] = at(p.at.x, p.at.y);
      this.add.rectangle(tx, ty, 4, 4, 0xffffff).setStrokeStyle(1, 0x000000);
    }
    if (!youreHere) return;
    // You are here (on top of everything).
    const me = whereOn(region);
    const [mx, my] = at(me.x, me.y);
    const marker = this.add.rectangle(mx, my, 6, 6, 0xe8b923).setStrokeStyle(1, 0x000000);
    this.tweens.add({ targets: marker, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
  }

  /* Fast travel: every place you can go, in any region. */
  drawTravel() {
    const px = MAP_X + MAP_W + 12, pw = WIDTH - px - 6;
    panel(this, px, MAP_Y - 2, pw, MAP_H + 4);
    text(this, px + 8, MAP_Y + 6, "FAST TRAVEL", { color: COLORS.gold });
    const open = canFastTravel(state);
    const points = travelPoints(state.flags);
    points.forEach((p, i) => {
      const b = button(this, px + pw / 2, MAP_Y + 34 + i * 26, pw - 16, 20, p.found ? p.name.toUpperCase() : "???", () => this.go(p));
      b.setEnabled(open && p.found);
    });
    const found = points.filter(p => p.found).length;
    const note = !open ? "You can only travel from a town or a camp: Oakhollow, Old Tom's hut or the Goblin Rocks campfire."
      : found < points.length ? "Find more places to travel to them. White squares are places you can go."
        : "White squares are places you can go.";
    text(this, px + 8, MAP_Y + 34 + points.length * 26, note, { color: COLORS.dim, wordWrap: { width: pw - 16 }, lineSpacing: 4 });
  }

  /* Closes the map and has the world take you there. */
  go(point) {
    sfx("select");
    this.scene.get("World").pendingTravel = { map: point.map, at: point.at };
    this.close();
  }

  close() {
    this.scene.stop();
    this.scene.resume("World");
  }
}
