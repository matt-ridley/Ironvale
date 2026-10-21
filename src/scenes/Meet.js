// The meeting screen. Walk into a person or a thing (a chest, the fallen oak, the Goblin King) and the world gives way
// to a stage like the battle screen's: your party on the left, whoever or whatever you met on the right. What they
// say goes in the panel at the bottom and your answers are big buttons on the right; tap one, or use up/down and
// Enter (number keys work too). A chest opens on screen and shows each thing that comes out of it before saying what
// you found. When the conversation ends it goes back to the world or, if the script asked for one, starts a battle
// or takes you to another map. (The cave entrance, which isn't a map object, still uses the Dialogue box.)
import { WIDTH, HEIGHT, COLORS } from "../config.js";
import { state } from "../state/game.js";
import { feetAt } from "../world/movement.js";
import { SCRIPTS } from "../story/scripts.js";
import { startConversation, view, choose, takeEvents } from "../story/dialogue.js";
import { uiCamera, text, trackTaps, freshTap } from "../ui/widgets.js";
import { GROUND_Y, PANEL_Y, stageZone, drawBackdrop, standParty, stand, breathe } from "../ui/stage.js";
import { heroFrame, R } from "../art/pixels.js";
import { SPRITES } from "../art/sprites.js";
import { sfx } from "../audio/sound.js";

const THEM_X = 360;
// Names for the things that don't say who they are.
const NAMES = { chest: "CHEST", bow: "BOW", log: "FALLEN OAK", gate: "IRON GATE", goblinKing: "GOBLIN KING", journal: "JOURNAL", bed: "SPARE BED", campfire: "CAMPFIRE", signet: "IRON SIGNET", rubble: "FALLEN ROCK", flood: "FLOODWATER", portcullis: "PORTCULLIS", fenGate: "FENWATCH GATE", crown: "CROWN", board: "BOUNTY BOARD", shrine: "SHRINE", cairn: "OLD GRAVES", lever: "LEVER", seal: "ALTAR", tombDoor: "TOMB DOOR", sarcophagus: "SARCOPHAGUS", archeryTarget: "TARGET", fishingRod: "FISHING ROD" };
const TEXT_W = 290;
const BTN_X = 394, BTN_W = 152, BTN_H = 28, BTN_GAP = 6; // the answer buttons: centre x, size, gap
const SLIM_H = 18, SLIM_GAP = 3; // with more than three answers, slimmer buttons (keep those labels to one line)
const POP_MS = 500; // between things coming out of a chest

export class Meet extends Phaser.Scene {
  constructor() { super("Meet"); }

  /* data: { script: name in SCRIPTS, object: the map object you walked into, zone: the zone you're in } */
  create(data) {
    uiCamera(this);
    trackTaps(this); // a thumb still on the joystick when this opens doesn't pick anything when it lets go
    // Phaser reuses this scene object, so reset everything here.
    this.done = false;
    this.busy = false;
    this.buttons = [];
    this.selected = 0;
    this.events_ = [];
    const o = data.object;
    this.convo = startConversation(SCRIPTS[data.script], state, { object: o });

    drawBackdrop(this, stageZone(data.zone, state.map === "overworld" ? "village" : "cave"));
    const party = standParty(this, state.hero.companion?.id);
    // People drawn on a walking sheet (Megan) turn to face you; monsters are drawn facing right, so they flip.
    const sheet = o.frame !== undefined;
    this.them = stand(this, THEM_X, o.sprite, sheet ? heroFrame("side") : undefined).setFlipX(sheet || o.sprite === "goblinKing");
    // Things drawn with empty rows under them (the oak, a chest) are lowered to stand on the ground.
    const art = SPRITES[o.sprite] || [];
    let blank = 0;
    while (blank < art.length && !/[^.]/.test(art[art.length - 1 - blank])) blank++;
    this.them.y += blank * R * this.them.scaleY;
    if (o.sprite === "rachel") this.add.image(THEM_X + 16, GROUND_Y - 64, "quill").setScale(0.6).setFlipX(true); // Quill, on her shoulder
    breathe(this, [party.hero, ...(party.ally ? [party.ally] : []), ...(o.still ? [] : [this.them])]);
    const first = view(this.convo);
    const top = this.them.y - this.them.displayHeight;
    this.nameTag = text(this, THEM_X, top - 14, NAMES[o.sprite] ?? first?.speaker ?? "", { stroke: "#000000", strokeThickness: 2 }).setOrigin(0.5);

    // The panel: who's talking and what they say on the left, your answers on the right. With a single answer
    // ("Continue" or "Close"), tapping anywhere on the panel picks it.
    this.add.rectangle(0, PANEL_Y, WIDTH, HEIGHT - PANEL_Y, COLORS.panel).setOrigin(0).setStrokeStyle(1, COLORS.panelEdge)
      .setInteractive().on("pointerup", p => { if (this.buttons.length === 1 && freshTap(this, p)) this.pick(0); });
    this.speaker = text(this, 10, PANEL_Y + 8, "", { color: COLORS.gold });
    this.body = text(this, 10, 0, "", { wordWrap: { width: TEXT_W }, lineSpacing: 5 });

    const kb = this.input.keyboard;
    kb.on("keydown-UP", () => this.highlight(this.selected - 1));
    kb.on("keydown-W", () => this.highlight(this.selected - 1));
    kb.on("keydown-DOWN", () => this.highlight(this.selected + 1));
    kb.on("keydown-S", () => this.highlight(this.selected + 1));
    kb.on("keydown-ENTER", () => this.pick(this.selected));
    kb.on("keydown-SPACE", () => this.pick(this.selected));
    kb.on("keydown", e => { const n = Number(e.key); if (n >= 1 && n <= this.buttons.length) this.pick(n - 1); });

    this.cameras.main.fadeIn(200);
    const loot = this.takeEvents().find(e => e.type === "loot");
    if (loot) this.openChest(loot.found);
    else this.show();
  }

  takeEvents() {
    const e = takeEvents(this.convo);
    this.events_.push(...e);
    return e;
  }

  /* The lid comes up, then each thing inside pops out and settles above the chest; then the panel says it all. */
  openChest(found) {
    this.busy = true;
    this.time.delayedCall(350, () => {
      sfx("door");
      this.them.setTexture("chestOpen");
      this.tweens.add({ targets: this.them, y: this.them.y - 4, duration: 90, yoyo: true });
      this.tweens.add({ targets: this.nameTag, alpha: 0, duration: 200 }); // the loot goes where the name was
    });
    found.forEach((thing, i) => this.time.delayedCall(700 + i * POP_MS, () => {
      sfx("coin");
      const y = GROUND_Y - 40 - (found.length - i) * 14;
      const t = text(this, THEM_X, GROUND_Y - 30, thing, { color: COLORS.gold, stroke: "#000000", strokeThickness: 3 }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: t, y, alpha: 1, duration: 300, ease: "Back.out" });
    }));
    this.time.delayedCall(700 + found.length * POP_MS, () => { this.busy = false; this.show(); });
  }

  show() {
    const v = view(this.convo);
    if (!v) return this.finish();
    for (const b of this.buttons) { b.bg.destroy(); b.label.destroy(); }
    this.speaker.setText(v.speaker);
    this.body.setText(v.text).setY(PANEL_Y + (v.speaker ? 24 : 10));
    const slim = v.choices.length > 3, h = slim ? SLIM_H : BTN_H, gap = slim ? SLIM_GAP : BTN_GAP;
    this.buttons = v.choices.map((c, i) => {
      // A lone "Continue" or "Close" sits at the bottom; a list of answers stacks from the top.
      const y = v.choices.length === 1 ? HEIGHT - 8 - h / 2 : PANEL_Y + 8 + h / 2 + i * (h + gap);
      const bg = this.add.rectangle(BTN_X, y, BTN_W, h, COLORS.bg).setStrokeStyle(1, COLORS.panelEdge).setInteractive({ useHandCursor: true });
      const label = text(this, BTN_X, y, `${v.choices.length > 1 ? `${i + 1}. ` : ""}${c.label}`.toUpperCase(),
        { align: "center", wordWrap: { width: BTN_W - 10 }, lineSpacing: 3 }).setOrigin(0.5);
      bg.on("pointerover", () => this.highlight(i));
      bg.on("pointerup", p => { if (freshTap(this, p)) this.pick(i); });
      return { bg, label };
    });
    this.highlight(0);
  }

  highlight(i) {
    if (!this.buttons.length) return;
    this.selected = (i + this.buttons.length) % this.buttons.length;
    this.buttons.forEach((b, j) => {
      b.bg.setFillStyle(j === this.selected ? COLORS.panelEdge : COLORS.bg);
      b.label.setColor(j === this.selected ? COLORS.gold : COLORS.text);
    });
  }

  pick(i) {
    if (!this.buttons[i] || this.done || this.busy) return;
    sfx("select");
    choose(this.convo, i);
    this.takeEvents();
    this.show();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    const battle = this.events_.find(e => e.type === "battle");
    const travel = this.events_.find(e => e.type === "travel");
    const shop = this.events_.find(e => e.type === "shop"); // a person who keeps a shop (Brannoc in the keep)
    const game = this.events_.find(e => e.type === "minigame"); // knucklebones, arm wrestling, archery, fishing
    this.cameras.main.fadeOut(200);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      if (battle) {
        this.scene.stop("World");
        this.scene.start("Battle", battle);
      } else if (travel) {
        state.map = travel.map;
        state.pos = feetAt(travel.at.x, travel.at.y);
        state.stepsSinceFight = 0;
        this.scene.stop("World");
        this.scene.start("World");
      } else if (shop || game) {
        this.scene.launch(game ? game.key : "Shop", game ? game.data : { shop: shop.shop }); // the world stays paused until it closes
        this.scene.stop();
      } else {
        this.scene.stop();
        this.scene.resume("World");
      }
    });
  }
}
