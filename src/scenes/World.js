// The overworld. Move in 8 directions with the joystick (touch), arrow keys or WASD (hold Shift to run); the camera
// glides after the hero. Walk into people, the fallen oak or the smithy door (or press Enter/Space facing them) to
// interact. Wild areas can start a fight as you walk; Oakhollow heals you. The HUD lives in the Hud scene on top.
import { TILE, WORLD_ZOOM, FONT, COLORS } from "../config.js";
import { createMap, frameGrid, zoneAt, tileAt, objectAt, activeObjects } from "../world/map.js";
import { moveBody, velocity, facingFor, tileOf, tileAhead, WALK_SPEED } from "../world/movement.js";
import { OVERWORLD } from "../world/overworld.js";
import { state, autosave } from "../state/game.js";
import { rollEncounter } from "../world/encounters.js";
import { rest } from "../rules/character.js";
import { stick } from "../ui/joystick.js";
import { playMusic, sfx } from "../audio/sound.js";

const MAPS = { [OVERWORLD.name]: createMap(OVERWORLD) };
const KEYS = { up: ["UP", "W"], down: ["DOWN", "S"], left: ["LEFT", "A"], right: ["RIGHT", "D"] };
const sheetFacing = f => (f === "left" || f === "right" ? "side" : f);
const px = n => Math.round(n * TILE);
const key = t => `${t.x},${t.y}`;

export class World extends Phaser.Scene {
  constructor() { super("World"); }

  /* data.quiet: coming back from a fight where you started it, so don't announce the area again. */
  create(data = {}) {
    this.map = MAPS[state.map];
    this.frozen = false;
    this.bumped = null; // the tile last walked into, so holding a direction doesn't reopen a door
    this.walked = 0; // distance since the last "step" (a tile's worth of walking)
    this.pendingHud = [];
    this.lastTile = tileOf(state.pos);
    this.zoneId = data.quiet ? zoneAt(this.map, this.lastTile.x, this.lastTile.y)?.id ?? null : null;

    const tilemap = this.make.tilemap({ data: frameGrid(this.map), tileWidth: TILE, tileHeight: TILE });
    tilemap.createLayer(0, tilemap.addTilesetImage("tiles"), 0, 0);

    // People and things stand on their tile's bottom edge; everything is drawn in order of where its feet are.
    this.objectSprites = Object.fromEntries(this.map.objects.map(o => {
      const s = this.add.image(px(o.x + 0.5), px(o.y + 1) - 2, o.sprite).setOrigin(0.5, 1).setDepth(px(o.y + 1));
      if (o.id !== "fallenLog") this.tweens.add({ targets: s, y: s.y - 2, duration: 900 + (o.x % 3) * 120, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      return [o.id, s];
    }));
    this.syncObjects();

    this.shadow = this.add.ellipse(0, 0, 22, 7, 0x000000, 0.25);
    this.player = this.add.sprite(0, 0, "hero").setOrigin(0.5, 1);
    this.placePlayer();
    this.player.play(`idle-${sheetFacing(state.facing)}`);
    this.player.setFlipX(state.facing === "left");
    this.cameras.main.setZoom(WORLD_ZOOM).setBounds(0, 0, this.map.width * TILE, this.map.height * TILE)
      .startFollow(this.player, true, 0.14, 0.14, 0, TILE * 0.75);
    this.cameras.main.fadeIn(250);

    this.keys = Object.fromEntries(Object.entries(KEYS).map(([dir, names]) => [dir, names.map(n => this.input.keyboard.addKey(n))]));
    this.shift = this.input.keyboard.addKey("SHIFT");
    this.input.keyboard.on("keydown-ESC", () => this.toTitle());
    this.input.keyboard.on("keydown-I", () => this.openOverlay("Inventory"));
    this.input.keyboard.on("keydown-ENTER", () => this.interactAhead());
    this.input.keyboard.on("keydown-SPACE", () => this.interactAhead());
    // Scene events outlive a restart, so swap the listener rather than adding another.
    this.events.off("resume", this.onResume, this);
    this.events.on("resume", this.onResume, this);
    this.events.once("shutdown", () => this.scene.stop("Hud"));

    this.scene.launch("Hud");
    this.enteredTile(false);
    autosave();
  }

  /* The Hud scene starts a moment after this one; messages wait for it. */
  get hud() { const h = this.scene.get("Hud"); return h && h.sys.isActive() ? h : null; }
  hudReady(hud) { for (const [kind, msg, ms] of this.pendingHud) hud[kind](msg, ms); this.pendingHud = []; }
  say(kind, msg, ms) { if (this.hud) this.hud[kind](msg, ms); else this.pendingHud.push([kind, msg, ms]); }

  placePlayer(bob = 0) {
    const x = px(state.pos.x), y = px(state.pos.y);
    this.player.setPosition(x, y - bob).setDepth(y);
    this.shadow.setPosition(x, y - 1).setDepth(y - 1);
  }

  toTitle() {
    if (this.frozen) return;
    this.frozen = true;
    this.cameras.main.fadeOut(200);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Title"));
  }

  /* Opens a menu screen over the world and pauses it (and the HUD) until it closes. */
  openOverlay(key, data) {
    if (this.frozen) return;
    this.frozen = true;
    this.player.play(`idle-${sheetFacing(state.facing)}`);
    this.scene.pause("Hud");
    this.scene.launch(key, data);
    this.scene.pause();
  }

  onResume() {
    this.frozen = false;
    this.input.keyboard.resetKeys(); // keys let go while a menu was open would otherwise still read as held
    // A conversation can move you (climbing the oak) or change the map (shoving it away).
    this.placePlayer();
    this.lastTile = tileOf(state.pos);
    this.syncObjects();
    this.scene.resume("Hud");
    this.hud?.refresh();
    autosave();
  }

  /* Hides objects that the quest flags have removed. */
  syncObjects() {
    const active = new Set(activeObjects(this.map, state.flags).map(o => o.id));
    for (const [id, sprite] of Object.entries(this.objectSprites)) sprite.setVisible(active.has(id));
  }

  /* Whatever is on the tile in front of you: a person or thing to talk to, or a door. */
  thingAt(t) {
    const obj = objectAt(this.map, t.x, t.y, state.flags);
    if (obj) return { obj };
    const place = tileAt(this.map, t.x, t.y)?.place;
    return place ? { place } : null;
  }

  interactWith(thing) {
    if (thing.obj) { sfx("select"); this.openOverlay("Dialogue", { script: thing.obj.script, object: thing.obj }); }
    else if (thing.place === "blacksmith") { sfx("door"); this.openOverlay("Blacksmith"); }
  }

  /* Enter or Space: talk to whoever you're facing. */
  interactAhead() {
    if (this.frozen) return;
    const thing = this.thingAt(tileAhead(state.pos, state.facing));
    if (thing) this.interactWith(thing);
  }

  /* Direction from the keys (with Shift to run) or the joystick, as a velocity in tiles per second. */
  readInput() {
    const held = dir => this.keys[dir].some(k => k.isDown);
    const kx = (held("right") ? 1 : 0) - (held("left") ? 1 : 0), ky = (held("down") ? 1 : 0) - (held("up") ? 1 : 0);
    if (kx || ky) {
      const len = Math.hypot(kx, ky);
      return velocity((kx / len) * 0.9, (ky / len) * 0.9, { run: this.shift.isDown });
    }
    return velocity(stick.x, stick.y);
  }

  update(time, delta) {
    if (this.frozen) return;
    const dt = Math.min(delta, 50) / 1000;
    const { vx, vy, speed } = this.readInput();
    if (!speed) {
      this.player.play(`idle-${sheetFacing(state.facing)}`, true);
      this.placePlayer(Math.round(Math.sin(time / 450) * 0.6 + 0.4)); // breathing
      return;
    }
    state.facing = facingFor(vx, vy, state.facing);
    this.player.setFlipX(state.facing === "left");
    this.player.play(`walk-${sheetFacing(state.facing)}`, true);
    this.player.anims.timeScale = speed / WALK_SPEED;

    const before = state.pos;
    const moved = moveBody(this.map, before, vx * dt, vy * dt, state.flags);
    state.pos = { x: moved.x, y: moved.y };
    this.placePlayer();
    const dist = Math.hypot(moved.x - before.x, moved.y - before.y);

    // Walked into something: a door or a person in front of you, once per bump.
    if ((moved.blockedX || moved.blockedY) && dist < speed * dt * 0.5) {
      const ahead = tileAhead(state.pos, state.facing);
      const thing = this.thingAt(ahead);
      if (thing && this.bumped !== key(ahead)) {
        this.bumped = key(ahead);
        return this.interactWith(thing);
      }
    } else if (dist > 0.01) this.bumped = null;

    this.walked += dist;
    while (this.walked >= 1 && !this.frozen) { this.walked -= 1; this.onStep(); }
    const t = tileOf(state.pos);
    if (!this.frozen && key(t) !== key(this.lastTile)) { this.lastTile = t; this.enteredTile(true); }
  }

  /* Every tile's worth of walking: count it for encounters, save, and maybe start a fight. */
  onStep() {
    state.stepsSinceFight++;
    autosave();
    const t = tileOf(state.pos);
    const zone = zoneAt(this.map, t.x, t.y);
    const foes = rollEncounter(zone?.id, tileAt(this.map, t.x, t.y).name, state.stepsSinceFight);
    if (foes) this.startBattle(foes, zone.id);
  }

  /* On reaching a new tile (moved = true) and on entering the scene: area names, music, resting, the cave. */
  enteredTile(moved) {
    const t = tileOf(state.pos);
    const zone = zoneAt(this.map, t.x, t.y);
    if (zone && zone.id !== this.zoneId) {
      this.zoneId = zone.id;
      this.say("banner", zone.name, 1800);
      // Until the inn opens, coming home to the village is a full rest.
      const h = state.hero;
      if (zone.id === "village" && (h.hp < h.maxHp || !h.secondWind)) {
        rest(h);
        this.hud?.refresh();
        this.say("note", "You rest in Oakhollow. HP and Second Wind restored.", 2200);
      }
    }
    playMusic(this.zoneId === "village" || !this.zoneId ? "village" : "wild");
    const above = tileAt(this.map, t.x, t.y - 1);
    if (above?.place === "blacksmith") this.say("note", "The blacksmith's forge. Walk into the door to go in.", 2200);
    if (moved && tileAt(this.map, t.x, t.y).name === "cave") this.openOverlay("Dialogue", { script: "cave" });
  }

  startBattle(foes, zoneId) {
    this.frozen = true;
    state.stepsSinceFight = 0;
    this.player.play(`idle-${sheetFacing(state.facing)}`);
    sfx("alert");
    const alert = this.add.text(this.player.x, this.player.y - 52, "!", { fontFamily: FONT, fontSize: "20px", color: COLORS.gold, stroke: "#000000", strokeThickness: 6 })
      .setOrigin(0.5, 1).setDepth(10000);
    this.tweens.add({ targets: alert, y: alert.y - 8, duration: 140, yoyo: true });
    this.cameras.main.shake(250, 0.004);
    this.time.delayedCall(450, () => {
      this.cameras.main.fadeOut(250);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Battle", { foes, zone: zoneId }));
    });
  }
}
