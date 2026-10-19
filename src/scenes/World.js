// The world: whichever map state.map names (the overworld or the Deep Warrens). Move in 8 directions with the joystick
// (touch), arrow keys or WASD (hold Shift to run); the camera glides after the hero. Walk into people, things or shop
// doors (or press Enter/Space facing them) to interact, and onto an exit to go to another map. Wild areas can start
// a fight as you walk; Oakhollow heals you. A Potion of Speed makes you faster and fights rarer for a number of
// steps. A companion in your party walks along behind you. The HUD lives in the Hud scene on top.
import { TILE, WORLD_ZOOM, FONT, COLORS } from "../config.js";
import { frameGrid, zoneAt, tileAt, objectAt, activeObjects, exitAt } from "../world/map.js";
import { moveBody, velocity, facingFor, tileOf, tileAhead, feetAt, WALK_SPEED, SPEED_POTION_BOOST } from "../world/movement.js";
import { MAPS } from "../world/maps.js";
import { state, autosave } from "../state/game.js";
import { rollEncounter } from "../world/encounters.js";
import { rest } from "../rules/character.js";
import { stick } from "../ui/joystick.js";
import { animKey } from "../art/pixels.js";
import { playMusic, sfx } from "../audio/sound.js";

const KEYS = { up: ["UP", "W"], down: ["DOWN", "S"], left: ["LEFT", "A"], right: ["RIGHT", "D"] };
const sheetFacing = f => (f === "left" || f === "right" ? "side" : f);
const px = n => Math.round(n * TILE);
const key = t => `${t.x},${t.y}`;
const FOLLOW_GAP = 9; // trail points (about a tenth of a tile apart) between you and your companion
const PLACE_NOTES = {
  blacksmith: "The blacksmith's forge. Walk into the door to go in.",
  apothecary: "The apothecary: potions! Walk into the door to go in.",
  bank: "The bank: keep your gold safe. Walk into the door to go in.",
};

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
      const s = this.add.image(px(o.x + 0.5), px(o.y + 1) - 2, o.sprite, o.frame).setOrigin(0.5, 1).setDepth(px(o.y + 1));
      if (!o.still) this.tweens.add({ targets: s, y: s.y - 2, duration: 900 + (o.x % 3) * 120, yoyo: true, repeat: -1, ease: "Sine.inOut" });
      return [o.id, s];
    }));
    this.syncObjects();

    this.shadow = this.add.ellipse(0, 0, 22, 7, 0x000000, 0.25);
    this.player = this.add.sprite(0, 0, "hero").setOrigin(0.5, 1);
    this.follower = null;
    this.trail = []; // where the hero's feet have been lately, for the companion to follow
    this.syncFollower();
    this.placePlayer();
    this.player.play(`idle-${sheetFacing(state.facing)}`);
    this.player.setFlipX(state.facing === "left");
    this.cameras.main.setBackgroundColor(this.map.name === "overworld" ? COLORS.bg : 0x0f0d14);
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
    if (this.follower) {
      // A step or so behind, along the way you came (or just behind you, before you've moved).
      const p = this.trail.length > FOLLOW_GAP ? this.trail[this.trail.length - 1 - FOLLOW_GAP] : { x: state.pos.x, y: state.pos.y - 0.5 };
      const f = this.follower, fx = px(p.x), fy = px(p.y);
      // Walks when you do, facing the way they're going.
      const dx = fx - (f.at?.x ?? fx), dy = fy - (f.at?.y ?? fy);
      if (dx || dy) f.facing = facingFor(dx, dy, f.facing);
      f.at = { x: fx, y: fy };
      const walking = this.player.anims.currentAnim?.key.startsWith("walk");
      f.sprite.play(animKey(f.key, walking ? "walk" : "idle", sheetFacing(f.facing)), true).setFlipX(f.facing === "left");
      f.sprite.anims.timeScale = this.player.anims.timeScale;
      f.sprite.setPosition(fx, fy - bob).setDepth(fy);
      f.shadow.setPosition(fx, fy - 1).setDepth(fy - 1);
    }
  }

  /* Shows your companion (once someone has joined the party). */
  syncFollower() {
    const c = state.hero.companion;
    if (!c || this.follower || !this.textures.exists(c.id)) return;
    this.follower = {
      shadow: this.add.ellipse(0, 0, 18, 6, 0x000000, 0.25),
      sprite: this.add.sprite(0, 0, c.id, 0).setOrigin(0.5, 1),
      key: c.id,
      facing: state.facing,
    };
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
    this.syncFollower();
    this.trail = []; // you may have been moved (over the oak, through the gate)
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
    else if (thing.place === "bank") { sfx("door"); this.openOverlay("Bank"); }
    else if (thing.place) { sfx("door"); this.openOverlay("Shop", { shop: thing.place }); }
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
    let v;
    if (kx || ky) {
      const len = Math.hypot(kx, ky);
      v = velocity((kx / len) * 0.9, (ky / len) * 0.9, { run: this.shift.isDown });
    } else v = velocity(stick.x, stick.y);
    if (state.hero.effects?.speed > 0) for (const k of ["vx", "vy", "speed"]) v[k] *= SPEED_POTION_BOOST;
    return v;
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
    const last = this.trail.at(-1);
    if (!last || Math.hypot(state.pos.x - last.x, state.pos.y - last.y) >= 0.1) {
      this.trail.push({ x: state.pos.x, y: state.pos.y });
      if (this.trail.length > 40) this.trail.shift();
    }

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
    const fx = state.hero.effects;
    const fast = fx?.speed > 0;
    if (fast) {
      fx.speed--;
      if (!fx.speed) this.say("note", "Your Potion of Speed wears off.", 2200);
      this.hud?.refresh();
    }
    autosave();
    const t = tileOf(state.pos);
    const zone = zoneAt(this.map, t.x, t.y);
    const foes = rollEncounter(zone?.id, tileAt(this.map, t.x, t.y).name, state.stepsSinceFight, Math.random, { fast });
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
      if (zone.id === "village" && (h.hp < h.maxHp || !h.secondWind || h.companion?.hurt)) {
        rest(h);
        this.hud?.refresh();
        this.say("note", h.companion ? "You rest in Oakhollow. Everyone's HP and your Second Wind restored." : "You rest in Oakhollow. HP and Second Wind restored.", 2200);
      }
    }
    playMusic(this.zoneId === "village" || !this.zoneId ? "village" : "wild");
    const above = tileAt(this.map, t.x, t.y - 1);
    if (PLACE_NOTES[above?.place]) this.say("note", PLACE_NOTES[above.place], 2200);
    if (!moved) return;
    if (tileAt(this.map, t.x, t.y).name === "cave") this.openOverlay("Dialogue", { script: "cave" });
    const exit = exitAt(this.map, t.x, t.y);
    if (exit) this.travel(exit.to, exit.at);
  }

  /* Goes to another map, standing in tile `at`. */
  travel(mapName, at) {
    this.frozen = true;
    this.player.play(`idle-${sheetFacing(state.facing)}`);
    sfx("door");
    this.cameras.main.fadeOut(250);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      state.map = mapName;
      state.pos = feetAt(at.x, at.y);
      state.stepsSinceFight = 0;
      this.scene.restart();
    });
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
