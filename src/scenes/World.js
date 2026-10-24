// The world: whichever map state.map names (the overworld, the Deep Warrens or inside a house). Move in 8 directions
// with the joystick (touch), arrow keys or WASD (hold Shift to run); the camera glides after the hero. Walk into
// people, things or shop doors (or press Enter/Space facing them) to interact (people and things open the Meet
// screen), into a house door to go inside, and onto an exit (a doormat, the daylight in the cave) to go to another
// map. Q opens the quest log and M the world map (which can fast-travel you from a town or a camp). Wild areas can
// start a fight as you walk, except near a camp. A Potion of Speed makes you faster and fights rarer for a number of
// steps. A companion in your party walks along behind you. The HUD lives in the Hud scene on top. On ice you slide in
// a straight line (up, down, left or right) until you hit something or reach the end of the ice.
import { TILE, WORLD_ZOOM, FONT, COLORS } from "../config.js";
import { zoneAt, tileAt, objectAt, activeObjects, exitAt, doorAt } from "../world/map.js";
import { moveBody, velocity, facingFor, tileOf, tileAhead, feetAt, WALK_SPEED, SPEED_POTION_BOOST } from "../world/movement.js";
import { MAPS } from "../world/maps.js";
import { markSeen, safePlace } from "../world/travel.js";
import { state, autosave } from "../state/game.js";
import { rollEncounter, runsAway, RUN_AWAY_XP } from "../world/encounters.js";
import { actOf } from "../story/hero.js";
import { remarkFor } from "../story/talks.js";
import { zoneEvent } from "../story/act3.js";
import { act4Event } from "../story/act4.js";
import { COMPANIONS } from "../rules/party.js";
import { MONSTERS } from "../data/monsters.js";
import { gainXp, needsFightingStyle } from "../rules/character.js";
import { stick } from "../ui/joystick.js";
import { animKey, groundTexture, paintHero } from "../art/pixels.js";
import { playMusic, sfx } from "../audio/sound.js";

const KEYS = { up: ["UP", "W"], down: ["DOWN", "S"], left: ["LEFT", "A"], right: ["RIGHT", "D"] };
const sheetFacing = f => (f === "left" || f === "right" ? "side" : f);
const px = n => Math.round(n * TILE);
const key = t => `${t.x},${t.y}`;
const FOLLOW_GAP = 9; // trail points (about a tenth of a tile apart) between you and your companion
const SLIDE_SPEED = 6; // tiles per second, sliding on ice
const SLIDES = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const PLACE_NOTES = {
  blacksmith: "The blacksmith's forge. Walk into the door to go in.",
  apothecary: "The apothecary: potions! Walk into the door to go in.",
  bank: "The bank: keep your gold safe. Walk into the door to go in.",
  forge: "Brannoc's forge. Walk into the door to go in.",
  herbalist: "The fen herbalist: potions and remedies. Walk into the door to go in.",
};

export class World extends Phaser.Scene {
  constructor() { super("World"); }

  /* data.quiet: coming back from a fight where you started it, so don't announce the area again. data.script: a
     conversation to play straight away (the Goblin King's last words). */
  create(data = {}) {
    // Phaser keeps a scene's start data for any later restart that passes none (every map change), so without this a
    // boss's last words, and their reward, played again on every trip.
    this.sys.settings.data = {};
    this.map = MAPS[state.map];
    paintHero(this, state.hero.oath); // in their Oath's colours, once sworn
    this.frozen = false;
    this.bumped = null; // the tile last walked into, so holding a direction doesn't reopen a door
    this.walked = 0; // distance since the last "step" (a tile's worth of walking)
    this.sliding = null; // on ice: the direction you're sliding in
    this.pendingHud = [];
    this.hudUp = false; // until the Hud scene (re)starts and says it's ready
    this.lastTile = tileOf(state.pos);
    this.zone = zoneAt(this.map, this.lastTile.x, this.lastTile.y); // for its music (tiles in no zone keep the last)
    this.zoneId = data.quiet ? this.zone?.id ?? null : null;

    this.add.image(0, 0, groundTexture(this, this.map)).setOrigin(0);

    // People and things stand on their tile's bottom edge; everything is drawn in order of where its feet are.
    this.objectSprites = Object.fromEntries(this.map.objects.map(o => {
      const s = this.add.image(px(o.x + 0.5), px(o.y + 1) - 2, o.sprite, o.frame).setOrigin(0.5, 1).setDepth(px(o.y + 1));
      if (o.ghost) s.setAlpha(0.7); // Warden Colleen
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
    // A room smaller than the screen sits in the middle of it (Phaser would pin it to the top left).
    const cam = this.cameras.main, mapW = this.map.width * TILE, mapH = this.map.height * TILE;
    const boundsW = Math.max(mapW, cam.width / WORLD_ZOOM), boundsH = Math.max(mapH, cam.height / WORLD_ZOOM);
    cam.setZoom(WORLD_ZOOM).setBounds((mapW - boundsW) / 2, (mapH - boundsH) / 2, boundsW, boundsH)
      .startFollow(this.player, true, 0.14, 0.14, 0, TILE * 0.75);
    this.cameras.main.fadeIn(250);

    this.keys = Object.fromEntries(Object.entries(KEYS).map(([dir, names]) => [dir, names.map(n => this.input.keyboard.addKey(n))]));
    this.shift = this.input.keyboard.addKey("SHIFT");
    this.input.keyboard.on("keydown-ESC", () => this.toTitle());
    this.input.keyboard.on("keydown-I", () => this.openOverlay("Inventory"));
    this.input.keyboard.on("keydown-Q", () => this.openOverlay("Quests"));
    this.input.keyboard.on("keydown-M", () => this.openOverlay("WorldMap"));
    this.input.keyboard.on("keydown-ENTER", () => this.interactAhead());
    this.input.keyboard.on("keydown-SPACE", () => this.interactAhead());
    // Scene events outlive a restart, so swap the listener rather than adding another.
    this.events.off("resume", this.onResume, this);
    this.events.on("resume", this.onResume, this);
    this.events.once("shutdown", () => this.scene.stop("Hud"));

    this.scene.launch("Hud");
    this.enteredTile(false);
    autosave();
    if (data.script) this.time.delayedCall(300, () => this.openOverlay("Dialogue", { script: data.script }));
    this.time.delayedCall(400, () => this.offerLevelUp());
  }

  /* An ability score increase to spend (from a fight, a quest reward or an old save), or the fighting style to pick
     at level 10, opens the level-up screen. */
  offerLevelUp() {
    if ((state.hero.asi > 0 || needsFightingStyle(state.hero)) && !this.frozen) this.openOverlay("LevelUp");
  }

  /* The Hud scene starts a moment after this one; messages wait for it. (After a trip to another map the old Hud is
     still running while this scene sets up, and is about to be restarted, so it doesn't count until it says so.) */
  get hud() { const h = this.scene.get("Hud"); return this.hudUp && h && h.sys.isActive() ? h : null; }
  hudReady(hud) { this.hudUp = true; for (const [kind, msg, ms] of this.pendingHud) hud[kind](msg, ms); this.pendingHud = []; }
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
      if (f.owl) f.owl.setPosition(fx + (f.facing === "left" ? 10 : -10), fy - 54 - bob + Math.sin(this.time.now / 300) * 2).setFlipX(f.facing === "left").setDepth(fy + 1);
    }
  }

  /* Shows your companion walking behind you, or takes them away (left waiting at an inn), or swaps them. */
  syncFollower() {
    const c = state.hero.companion;
    if (this.follower && this.follower.key !== c?.id) {
      this.follower.sprite.destroy();
      this.follower.shadow.destroy();
      this.follower.owl?.destroy();
      this.follower = null;
    }
    if (!c || this.follower || !this.textures.exists(c.id)) return;
    this.follower = {
      shadow: this.add.ellipse(0, 0, 18, 6, 0x000000, 0.25),
      sprite: this.add.sprite(0, 0, c.id, 0).setOrigin(0.5, 1),
      key: c.id,
      facing: state.facing,
      owl: c.id === "rachel" ? this.add.image(0, 0, "quill") : null, // Quill flies along above her
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
    // The map asked for a fast trip somewhere.
    const trip = this.pendingTravel;
    this.pendingTravel = null;
    if (trip) return this.travel(trip.map, trip.at, "down");
    // A screen asked for a conversation to follow it (the Oath screen: what happens at the Door).
    const script = this.pendingScript;
    this.pendingScript = null;
    if (script) { this.time.delayedCall(200, () => this.openOverlay("Dialogue", { script })); this.scene.resume("Hud"); return; }
    this.input.keyboard.resetKeys(); // keys let go while a menu was open would otherwise still read as held
    // A conversation can move you (climbing the oak) or change the map (shoving it away).
    this.syncFollower();
    this.trail = []; // you may have been moved (over the oak, through the gate)
    this.placePlayer();
    this.lastTile = tileOf(state.pos);
    this.syncObjects();
    this.scene.resume("Hud"); // which refreshes itself
    autosave();
    this.time.delayedCall(250, () => this.offerLevelUp());
  }

  /* Hides objects that the quest flags have removed. */
  syncObjects() {
    const active = new Set(activeObjects(this.map, state.flags).map(o => o.id));
    for (const [id, sprite] of Object.entries(this.objectSprites)) sprite.setVisible(active.has(id));
  }

  /* Whatever is on the tile in front of you: a person or thing to talk to, a house door, or a shop door. */
  thingAt(t) {
    const obj = objectAt(this.map, t.x, t.y, state.flags);
    if (obj) return { obj };
    const door = doorAt(this.map, t.x, t.y);
    if (door) return { door };
    const place = tileAt(this.map, t.x, t.y)?.place;
    return place ? { place } : null;
  }

  interactWith(thing) {
    if (thing.obj) { sfx("select"); this.openOverlay("Meet", { script: thing.obj.script, object: thing.obj, zone: this.zoneId }); }
    else if (thing.door) this.travel(thing.door.to, MAPS[thing.door.to].spawn, "up");
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
    const t = tileOf(state.pos), slow = tileAt(this.map, t.x, t.y)?.slow; // wading through shallow water, or mud
    if (slow) for (const k of ["vx", "vy", "speed"]) v[k] *= slow;
    return v;
  }

  /* On ice you can't steer: you slide straight on until you hit something or the ice ends. Returns the velocity to
     use, or null when you're standing still on the ice (and nothing pushes you off). */
  iceVelocity(vx, vy, speed) {
    if (!this.sliding) {
      if (!speed) return null;
      this.sliding = Math.abs(vx) >= Math.abs(vy) ? (vx < 0 ? "left" : "right") : (vy < 0 ? "up" : "down");
      const t = tileOf(state.pos), centre = feetAt(t.x, t.y); // line up with the tile, so you slide straight
      state.pos = this.sliding === "left" || this.sliding === "right" ? { x: state.pos.x, y: centre.y } : { x: centre.x, y: state.pos.y };
      state.facing = this.sliding;
    }
    const [dx, dy] = SLIDES[this.sliding];
    return { vx: dx * SLIDE_SPEED, vy: dy * SLIDE_SPEED, speed: SLIDE_SPEED };
  }

  update(time, delta) {
    if (this.frozen) return;
    const dt = Math.min(delta, 50) / 1000;
    let { vx, vy, speed } = this.readInput();
    const here = tileOf(state.pos), onIce = !!tileAt(this.map, here.x, here.y)?.ice;
    if (!onIce) this.sliding = null;
    else {
      const v = this.iceVelocity(vx, vy, speed);
      ({ vx, vy, speed } = v || { vx: 0, vy: 0, speed: 0 });
    }
    if (!speed) {
      this.player.play(`idle-${sheetFacing(state.facing)}`, true);
      this.placePlayer(Math.round(Math.sin(time / 450) * 0.6 + 0.4)); // breathing
      return;
    }
    state.facing = facingFor(vx, vy, state.facing);
    this.player.setFlipX(state.facing === "left");
    if (this.sliding) this.player.play(`idle-${sheetFacing(state.facing)}`, true); // gliding, feet still
    else this.player.play(`walk-${sheetFacing(state.facing)}`, true);
    this.player.anims.timeScale = speed / WALK_SPEED;

    const before = state.pos;
    const moved = moveBody(this.map, before, vx * dt, vy * dt, state.flags);
    state.pos = { x: moved.x, y: moved.y };
    if (this.sliding && (moved.blockedX || moved.blockedY)) { // bump
      if (Math.hypot(moved.x - before.x, moved.y - before.y) > 0.02) this.cameras.main.shake(80, 0.002);
      this.sliding = null;
    }
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
    const safe = !!zone?.safe || !!safePlace(state); // no monsters in a town, indoors or near a camp
    const foes = rollEncounter(zone?.id, tileAt(this.map, t.x, t.y).name, state.stepsSinceFight, Math.random, { fast, safe });
    if (!foes) return;
    if (runsAway(zone.id, state.hero.level, actOf(state.flags))) return this.scareOff(foes);
    this.startBattle(foes, zone.id);
  }

  /* Monsters far too weak for you (Act 3, back in the old places) take one look and run, for a few XP. */
  scareOff(foes) {
    state.stepsSinceFight = 0;
    const xp = Math.max(1, Math.floor(foes.reduce((n, id) => n + MONSTERS[id].xp, 0) * RUN_AWAY_XP));
    const before = state.hero.level;
    gainXp(state.hero, xp);
    const w = state.hero.equipment.weapon, at = w?.base === "wardenblade" ? "the Wardenblade" : "you";
    const name = MONSTERS[foes[0]].name, plural = name === "Wolf" ? "Wolves" : `${name}s`;
    const who = foes.length > 1 ? `${foes.length} ${plural} take` : `A ${name} takes`;
    this.say("note", `${who} one look at ${at} and bolt${foes.length > 1 ? "" : "s"}. (+${xp} XP${state.hero.level > before ? `, level ${state.hero.level}!` : ""})`, 2400);
    this.hud?.refresh();
    if (state.hero.level > before) this.time.delayedCall(400, () => this.offerLevelUp());
  }

  /* On reaching a new tile (moved = true) and on entering the scene: area names, music, the last town, the cave. */
  enteredTile(moved) {
    const t = tileOf(state.pos);
    const zone = zoneAt(this.map, t.x, t.y);
    if (zone && zone.id !== this.zoneId) {
      this.zoneId = zone.id;
      markSeen(state.flags, zone.id); // for the map
      this.say("banner", zone.name, 1800);
      const event = zoneEvent(state, zone.id) || act4Event(state, zone.id);
      if (event?.note) { this.time.delayedCall(900, () => this.say("note", event.note, 3600)); this.syncObjects(); }
      if (event?.script) this.time.delayedCall(700, () => this.openOverlay("Dialogue", { script: event.script }));
      if (!event) {
        const remark = remarkFor(state, zone.id, Object.fromEntries(Object.entries(COMPANIONS).map(([id, c]) => [id, c.name])));
        if (remark) {
          state.flags[remark.flag] = true;
          this.time.delayedCall(1200, () => this.say("note", `${remark.name}: "${remark.line}"`, 3200));
        }
      }
    }
    const place = safePlace(state);
    if (place?.kind === "hub") state.lastHub = place.id; // where you wake if you faint, and where a feather goes
    if (zone) this.zone = zone;
    playMusic(place?.music ?? this.zone?.music ?? "village"); // a hub can have its own (the keep, once it's home)
    const above = tileAt(this.map, t.x, t.y - 1);
    if (PLACE_NOTES[above?.place]) this.say("note", PLACE_NOTES[above.place], 2200);
    const door = moved && doorAt(this.map, t.x, t.y - 1); // not when you've just come out of it
    if (door) this.say("note", `${door.name}. Walk into the door to go in.`, 2200);
    if (!moved) return;
    if (tileAt(this.map, t.x, t.y).name === "cave") this.openOverlay("Dialogue", { script: "cave" });
    const exit = exitAt(this.map, t.x, t.y);
    if (exit) this.travel(exit.to, exit.at, exit.facing);
  }

  /* Goes to another map, standing in tile `at` (and turned to `facing`, if given). */
  travel(mapName, at, facing) {
    this.frozen = true;
    this.player.play(`idle-${sheetFacing(state.facing)}`);
    sfx("door");
    this.cameras.main.fadeOut(250);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      state.map = mapName;
      state.pos = feetAt(at.x, at.y);
      if (facing) state.facing = facing;
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
