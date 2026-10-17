// The overworld: walk tile by tile with the arrow keys, WASD or the on-screen D-pad. The camera follows the hero.
// Wild areas can start a fight after any step; Oakhollow heals you. Walk into people (and the fallen oak) to talk.
import { WIDTH, FONT, COLORS } from "../config.js";
import { createMap, frameGrid, step, zoneAt, tileAt, placeAhead, objectAhead, activeObjects } from "../world/map.js";
import { objective } from "../story/scripts.js";
import { OVERWORLD } from "../world/overworld.js";
import { TILE } from "../art/tiles.js";
import { state } from "../state/game.js";
import { rollEncounter } from "../world/encounters.js";
import { rest } from "../rules/character.js";
import { DPad, wantsTouchControls } from "../ui/dpad.js";

const STEP_MS = 150;
const MAPS = { [OVERWORLD.name]: createMap(OVERWORLD) };
const KEYS = { up: ["UP", "W"], down: ["DOWN", "S"], left: ["LEFT", "A"], right: ["RIGHT", "D"] };
const centre = n => n * TILE + TILE / 2;

export class World extends Phaser.Scene {
  constructor() { super("World"); }

  /* data.quiet: coming back from a fight where you started it, so don't announce the area again. */
  create(data = {}) {
    this.map = MAPS[state.map];
    this.moving = false;
    this.zoneId = data.quiet ? zoneAt(this.map, state.pos.x, state.pos.y)?.id ?? null : null;

    const tilemap = this.make.tilemap({ data: frameGrid(this.map), tileWidth: TILE, tileHeight: TILE });
    tilemap.createLayer(0, tilemap.addTilesetImage("tiles"), 0, 0);

    this.objectSprites = Object.fromEntries(this.map.objects.map(o => [o.id, this.add.image(centre(o.x), centre(o.y), o.sprite).setDepth(9)]));
    this.syncObjects();
    this.player = this.add.image(centre(state.pos.x), centre(state.pos.y), "knight").setDepth(10);
    this.face(state.facing);
    this.cameras.main.setBounds(0, 0, this.map.width * TILE, this.map.height * TILE).startFollow(this.player, true);

    this.keys = Object.fromEntries(Object.entries(KEYS).map(([dir, names]) => [dir, names.map(n => this.input.keyboard.addKey(n))]));
    // A tap can go down and up between two frames, so remember it as well as checking what is held.
    this.tapped = null;
    for (const [dir, keys] of Object.entries(this.keys)) for (const k of keys) k.on("down", () => { this.tapped = dir; });
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("Title"));
    this.input.keyboard.on("keydown-I", () => this.openOverlay("Inventory"));
    this.input.keyboard.on("keydown-ENTER", () => this.interactAhead());
    this.input.keyboard.on("keydown-SPACE", () => this.interactAhead());
    this.dpad = wantsTouchControls(this) ? new DPad(this, 48, 222, dir => { this.tapped = dir; }) : null;
    this.bumped = false; // already walked into the door in front of you (so holding a key doesn't reopen the shop)
    // Scene events outlive a restart, so swap the listener rather than adding another.
    this.events.off("resume", this.onResume, this);
    this.events.on("resume", this.onResume, this);

    this.drawHud();
    this.arrived();
  }

  drawHud() {
    const fixed = o => o.setScrollFactor(0).setDepth(100);
    fixed(this.add.rectangle(4, 4, 112, 18, COLORS.panel, 0.85).setOrigin(0).setStrokeStyle(1, COLORS.panelEdge));
    this.hud = fixed(this.add.text(10, 9, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.text }));
    this.quest = fixed(this.add.text(6, 27, "", { fontFamily: FONT, fontSize: "8px", color: COLORS.gold, stroke: "#000000", strokeThickness: 3 }));
    const menu = fixed(this.add.rectangle(WIDTH - 4, 4, 52, 18, COLORS.panel, 0.85).setOrigin(1, 0).setStrokeStyle(1, COLORS.panelEdge).setInteractive({ useHandCursor: true }));
    fixed(this.add.text(WIDTH - 30, 13, "MENU", { fontFamily: FONT, fontSize: "8px", color: COLORS.text }).setOrigin(0.5));
    menu.on("pointerup", () => this.scene.start("Title"));
    const bag = fixed(this.add.rectangle(WIDTH - 60, 4, 44, 18, COLORS.panel, 0.85).setOrigin(1, 0).setStrokeStyle(1, COLORS.panelEdge).setInteractive({ useHandCursor: true }));
    fixed(this.add.text(WIDTH - 82, 13, "BAG", { fontFamily: FONT, fontSize: "8px", color: COLORS.text }).setOrigin(0.5));
    bag.on("pointerup", () => this.openOverlay("Inventory"));
    this.banner = fixed(this.add.text(WIDTH / 2, 52, "", { fontFamily: FONT, fontSize: "10px", color: COLORS.gold, stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5).setAlpha(0));
    this.note = fixed(this.add.text(WIDTH / 2, 250, "", {
      fontFamily: FONT, fontSize: "8px", color: COLORS.text, backgroundColor: "#000000aa", padding: { x: 6, y: 4 }, align: "center", wordWrap: { width: 300 },
    }).setOrigin(0.5).setAlpha(0));
    this.refreshHud();
  }

  refreshHud() {
    const h = state.hero;
    this.hud.setText(`LV ${h.level} HP ${h.hp}/${h.maxHp}`);
    const goal = objective(state.flags);
    this.quest.setText(goal ? `QUEST: ${goal}` : "");
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

  /* Opens a menu screen over the world and pauses walking until it closes. */
  openOverlay(key, data) {
    if (this.moving) return;
    this.tapped = null;
    if (this.dpad) this.dpad.dir = null;
    this.scene.launch(key, data);
    this.scene.pause();
  }

  onResume() {
    this.tapped = null;
    this.input.keyboard.resetKeys(); // keys let go while a menu was open would otherwise still read as held
    // A conversation can move you (climbing the oak) or change the map (shoving it away).
    this.player.setPosition(centre(state.pos.x), centre(state.pos.y));
    this.syncObjects();
    this.refreshHud();
  }

  /* Hides objects that the quest flags have removed. */
  syncObjects() {
    const active = new Set(activeObjects(this.map, state.flags).map(o => o.id));
    for (const [id, sprite] of Object.entries(this.objectSprites)) sprite.setVisible(active.has(id));
  }

  talkTo(obj) {
    this.openOverlay("Dialogue", { script: obj.script, object: obj });
  }

  /* Enter or Space talks to whoever you're facing. */
  interactAhead() {
    const obj = objectAhead(this.map, state.pos, state.facing, state.flags);
    if (obj && !this.moving) this.talkTo(obj);
  }

  update() {
    if (this.moving) return;
    const fresh = !!this.tapped;
    const dir = this.heldDir() || this.tapped;
    this.tapped = null;
    if (!dir) return;
    this.face(dir);
    const next = step(this.map, state.pos, dir, state.flags);
    if (!next.moved) {
      // Walking into a door or a person: once per bump, so holding the key doesn't reopen it.
      const place = placeAhead(this.map, state.pos, dir);
      const obj = objectAhead(this.map, state.pos, dir, state.flags);
      if ((place || obj) && (fresh || !this.bumped)) {
        this.bumped = true;
        if (obj) this.talkTo(obj);
        else if (place === "blacksmith") this.openOverlay("Blacksmith");
      }
      return;
    }
    this.bumped = false;
    this.moving = true;
    state.pos = { x: next.x, y: next.y };
    this.tweens.add({
      targets: this.player, x: centre(next.x), y: centre(next.y), duration: STEP_MS,
      onComplete: () => { this.moving = false; this.arrived(true); },
    });
    this.tweens.add({ targets: this.player, scaleY: 0.88, duration: STEP_MS / 2, yoyo: true });
  }

  /* Runs after each step (stepped = true) and on entering the scene: area names, resting, fights, things underfoot. */
  arrived(stepped = false) {
    const { x, y } = state.pos;
    const zone = zoneAt(this.map, x, y);
    const tile = tileAt(this.map, x, y);
    if (zone && zone.id !== this.zoneId) {
      this.zoneId = zone.id;
      this.flash(this.banner, zone.name, 1800);
      // Until the inn opens, coming home to the village is a full rest.
      const h = state.hero;
      if (zone.id === "village" && (h.hp < h.maxHp || !h.secondWind)) {
        rest(h);
        this.refreshHud();
        this.flash(this.note, "You rest in Oakhollow. HP and Second Wind restored.", 2200);
      }
    }
    if (placeAhead(this.map, state.pos, "up") === "blacksmith") this.flash(this.note, "The blacksmith's forge. Walk into the door to go in.", 2200);
    if (!stepped) return;
    if (tile.name === "cave") return this.openOverlay("Dialogue", { script: "cave" });
    state.stepsSinceFight++;
    const foes = rollEncounter(zone?.id, tile.name, state.stepsSinceFight);
    if (foes) this.startBattle(foes, zone.id);
  }

  startBattle(foes, zoneId) {
    this.moving = true; // freeze walking
    state.stepsSinceFight = 0;
    const alert = this.add.text(this.player.x, this.player.y - 14, "!", { fontFamily: FONT, fontSize: "10px", color: COLORS.gold, stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(20);
    this.tweens.add({ targets: alert, y: alert.y - 4, duration: 120, yoyo: true });
    this.cameras.main.shake(250, 0.004);
    this.time.delayedCall(450, () => {
      this.cameras.main.fadeOut(250);
      this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Battle", { foes, zone: zoneId }));
    });
  }

  flash(text, message, ms) {
    this.tweens.killTweensOf(text);
    text.setText(message).setAlpha(1);
    this.tweens.add({ targets: text, alpha: 0, delay: ms, duration: 500 });
  }
}
