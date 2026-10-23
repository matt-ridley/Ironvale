// The side-on stage that battles and meetings share: a sky, far hills or trees, and ground for people to stand on
// (or, indoors, a panelled wall and floorboards), above a panel for text and buttons. Your party stands on the left; whoever you face stands on the right.
import { WIDTH } from "../config.js";
import { heroFrame } from "../art/pixels.js";
import { MONSTER_ART, MONSTER_SCALE } from "../art/monsters.js";

export const GROUND_Y = 124;
export const PANEL_Y = 152;
export const HERO_X = 110, ALLY_X = 50;
// With a second companion (some Act 4 fights), everyone shuffles along to make room.
export const PARTY_OF_THREE = { hero: 132, ally: 84, ally2: 36 };

const SKY = {
  forest: { sky: 0x1d2b3a, far: 0x1f3a26, ground: 0x3e6a31, groundDark: 0x34592a },
  rocks: { sky: 0x2a2633, far: 0x45424f, ground: 0x6b6b72, groundDark: 0x5a5a61 },
  cave: { sky: 0x0f0d14, far: 0x26222e, ground: 0x3a3440, groundDark: 0x2e2934 },
  meadow: { sky: 0x3a5a8a, far: 0x3f6b3a, ground: 0x5aa04a, groundDark: 0x4a8a3c },
  village: { sky: 0x4a6a9a, far: 0x4f7a3f, ground: 0x6aa84f, groundDark: 0x5a9043 },
  indoors: { sky: 0x6b4f34, far: 0x4a3420, ground: 0xb07e4c, groundDark: 0x8a5e36 },
  fen: { sky: 0x3a4a48, far: 0x4a4238, ground: 0x5d7a3e, groundDark: 0x3c6e70 }, // mist, dead trees, marsh and pools
  keep: { sky: 0x1f1d26, far: 0x4a4652, ground: 0x6a6574, groundDark: 0x55505e }, // grey stone, in the dark
  mountain: { sky: 0x7f9ab8, far: 0x5d6a80, ground: 0xe4ebf3, groundDark: 0xb4c2d6 }, // snowy peaks under a cold sky
};
SKY.warrens = SKY.cave;
SKY.throne = SKY.cave;
SKY.drowned = SKY.keepGrounds = SKY.fenwatch = SKY.fen;
SKY.pass = SKY.slopes = SKY.snowfield = SKY.heights = SKY.gatehouseApproach = SKY.thorneCamp = SKY.watchtower = SKY.mountain;
SKY.frozenChapel = SKY.gatehouse = SKY.frozenForge = SKY.barracks = SKY.door = SKY.keep;
SKY.courtyard = SKY.chapel = SKY.armoury = SKY.tomb = SKY.keep;

/* A zone id the stage knows, or `fallback`. */
export const stageZone = (zone, fallback = "forest") => (SKY[zone] ? zone : fallback);

export function drawBackdrop(scene, zone) {
  const c = SKY[zone], g = scene.add.graphics();
  g.fillStyle(c.sky).fillRect(0, 0, WIDTH, PANEL_Y);
  g.fillStyle(c.far);
  if (zone === "indoors") {
    for (let x = 20; x < WIDTH; x += 90) g.fillRect(x, 0, 8, 96); // posts
    g.fillRect(0, 14, WIDTH, 6); // a beam
    g.fillStyle(c.ground).fillRect(0, 96, WIDTH, PANEL_Y - 96);
    g.fillStyle(c.groundDark);
    for (let y = 96; y < PANEL_Y; y += 9) g.fillRect(0, y, WIDTH, 1); // floorboards
    return;
  }
  if (zone === "forest") {
    for (let x = -10; x < WIDTH + 20; x += 26) {
      const h = 40 + ((x * 37) % 23);
      g.fillTriangle(x, 100, x + 14, 100 - h, x + 28, 100);
    }
  } else if (SKY[zone] === SKY.mountain) {
    for (const [cx, top, half] of [[40, 30, 80], [150, 10, 95], [270, 40, 75], [380, 18, 100], [470, 45, 70]]) {
      g.fillStyle(c.far).fillTriangle(cx - half, 100, cx, top, cx + half, 100);
      g.fillStyle(0xf4f8fc).fillTriangle(cx - half * 0.32, top + (100 - top) * 0.32, cx, top, cx + half * 0.32, top + (100 - top) * 0.32); // snow caps
    }
  } else if (SKY[zone] === SKY.fen) {
    for (let x = 10; x < WIDTH; x += 70 + ((x * 11) % 30)) { // bare dead trees in the mist
      const h = 40 + ((x * 13) % 30);
      g.fillRect(x, 100 - h, 4, h);
      g.fillRect(x - 10, 100 - h + 10, 12, 3); g.fillRect(x + 4, 100 - h + 18, 10, 3);
    }
  } else {
    for (let x = -20; x < WIDTH + 40; x += 60) g.fillEllipse(x + ((x * 13) % 20), 100, 80, 50 + ((x * 7) % 30));
  }
  g.fillStyle(c.ground).fillRect(0, 96, WIDTH, PANEL_Y - 96);
  g.fillStyle(c.groundDark);
  if (SKY[zone] === SKY.fen) for (let x = 0; x < WIDTH; x += 90) g.fillEllipse(x + 30, 112 + ((x * 3) % 30), 50, 8); // pools
  else for (let x = 0; x < WIDTH; x += 12) g.fillRect(x + ((x * 7) % 9), 100 + ((x * 5) % 48), 3, 2);
}

/* Something standing on the ground at x, with a shadow under it (on the hero's grid and scale; the traced monsters
   are drawn a little smaller, as in their reference). */
export function stand(scene, x, key, frame, { scale = MONSTER_ART[key] ? MONSTER_SCALE : 1.5, shadow = 40 } = {}) {
  scene.add.ellipse(x, GROUND_Y, shadow, 8, 0x000000, 0.3);
  return scene.add.image(x, GROUND_Y, key, frame).setOrigin(0.5, 1).setScale(scale);
}

/* The hero, and the companion behind them (allyId, if you have one), and a second one behind them (ally2Id, in some
   fights): { hero, ally, ally2 } sprites, null for anyone who isn't there. */
export function standParty(scene, allyId, ally2Id = null) {
  const xs = allyId && ally2Id ? PARTY_OF_THREE : { hero: HERO_X, ally: ALLY_X };
  const hero = stand(scene, xs.hero, "hero", heroFrame("side"));
  const ally = allyId ? stand(scene, xs.ally, allyId, heroFrame("side"), { shadow: 32 }) : null;
  const ally2 = allyId && ally2Id ? stand(scene, xs.ally2, ally2Id, heroFrame("side"), { shadow: 32 }) : null;
  for (const [id, x] of [[allyId, xs.ally], [ally2Id, xs.ally2]]) {
    if (id !== "rachel" || x === undefined) continue; // Quill, on her shoulder
    const owl = scene.add.image(x - 16, GROUND_Y - 64, "quill").setScale(0.6);
    scene.tweens.add({ targets: owl, y: owl.y - 2, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }
  return { hero, ally, ally2 };
}

/* Everyone breathes a little while waiting, out of step with each other. */
export function breathe(scene, sprites) {
  sprites.forEach((s, i) =>
    scene.tweens.add({ targets: s, scaleY: s.scaleY * 0.97, duration: 700 + i * 130, yoyo: true, repeat: -1, ease: "Sine.inOut" }));
}
