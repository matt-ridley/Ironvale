// Free 8-direction movement with tile collisions. Positions are in tiles (fractions allowed) and mark the hero's
// feet. The hero collides with a small box around the feet, so the head and shoulders can overlap things behind
// them, like in classic top-down RPGs.
// Moves are done one axis at a time, so you slide along walls. When you walk straight into a corner or the edge
// of a gap, you're nudged sideways into the opening (up to NUDGE of a tile), so one-tile gaps aren't fiddly.
import { tileAt, objectAt } from "./map.js";

export const HITBOX = { hw: 0.3, h: 0.3 }; // half width, and height above the feet, in tiles
export const NUDGE = 0.45;
export const WALK_SPEED = 3.2; // tiles per second
export const RUN_SPEED = 5.2;
const EPS = 1e-6;

/* Where the feet go when standing in the middle of a tile. */
export const feetAt = (tx, ty) => ({ x: tx + 0.5, y: ty + 0.85 });
/* The tile the feet are on. */
export const tileOf = pos => ({ x: Math.floor(pos.x), y: Math.floor(pos.y - EPS) });

/* True if the hitbox with its feet at (x, y) overlaps a wall, a solid object, or the map edge. */
export function blockedAt(map, x, y, flags = {}) {
  const left = x - HITBOX.hw, right = x + HITBOX.hw - EPS, top = y - HITBOX.h, bottom = y - EPS;
  for (let ty = Math.floor(top); ty <= Math.floor(bottom); ty++) {
    for (let tx = Math.floor(left); tx <= Math.floor(right); tx++) {
      const t = tileAt(map, tx, ty);
      if (!t || t.solid || objectAt(map, tx, ty, flags)) return true;
    }
  }
  return false;
}

/* Direction to a speed: input (ix, iy) of length up to 1 (a joystick), or keys (-1/0/1 each), normalised so
   diagonals are no faster. Past 0.9 of the way out, the joystick runs. */
export function velocity(ix, iy, { run = false } = {}) {
  const len = Math.hypot(ix, iy);
  if (len < 0.15) return { vx: 0, vy: 0, speed: 0 };
  const mag = Math.min(len, 1);
  const speed = run || mag > 0.9 ? RUN_SPEED : WALK_SPEED * Math.max(mag, 0.45) / 0.9;
  return { vx: (ix / len) * speed, vy: (iy / len) * speed, speed };
}

/* Moves by (dx, dy) tiles, stopping at walls and sliding along them. */
export function moveBody(map, pos, dx, dy, flags = {}) {
  let { x, y } = pos, blockedX = false, blockedY = false;
  if (dx) {
    if (!blockedAt(map, x + dx, y, flags)) x += dx;
    else {
      blockedX = true;
      x = clampToWall(map, x, y, dx, true, flags);
      if (!dy) y += nudge(map, x + Math.sign(dx) * 0.05, y, false, Math.abs(dx), flags);
    }
  }
  if (dy) {
    if (!blockedAt(map, x, y + dy, flags)) y += dy;
    else {
      blockedY = true;
      y = clampToWall(map, x, y, dy, false, flags);
      if (!dx) x += nudge(map, x, y + Math.sign(dy) * 0.05, true, Math.abs(dy), flags);
    }
  }
  return { x, y, blockedX, blockedY };
}

/* Moves as far as possible toward the wall without touching it (in small steps; moves are short). */
function clampToWall(map, x, y, d, horizontal, flags) {
  const steps = 8, s = d / steps;
  for (let i = 0; i < steps; i++) {
    const nx = horizontal ? x + s : x, ny = horizontal ? y : y + s;
    if (blockedAt(map, nx, ny, flags)) break;
    x = nx; y = ny;
  }
  return horizontal ? x : y;
}

/* The small sideways shift (along the other axis) that would let you through, capped to `limit` per move. */
function nudge(map, x, y, alongX, limit, flags) {
  for (let off = 0.05; off <= NUDGE; off += 0.05) {
    for (const sign of [-1, 1]) {
      const nx = alongX ? x + sign * off : x, ny = alongX ? y : y + sign * off;
      if (!blockedAt(map, nx, ny, flags)) return sign * Math.min(off, limit);
    }
  }
  return 0;
}

/* A facing name for the sprite: diagonals use the side frames. */
export function facingFor(vx, vy, current = "down") {
  if (!vx && !vy) return current;
  if (Math.abs(vx) >= Math.abs(vy) * 0.5) return vx < 0 ? "left" : "right";
  return vy < 0 ? "up" : "down";
}

/* The tile one step ahead of the feet in the facing direction (for talking and doors). */
export function tileAhead(pos, facing) {
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[facing] || [0, 1];
  // Reach about half a tile past the hitbox, so it finds the next tile whether you're touching it or not.
  const probeY = facing === "up" ? pos.y - HITBOX.h - 0.6 : facing === "down" ? pos.y + 0.3 : pos.y - HITBOX.h / 2;
  const probeX = pos.x + d[0] * (HITBOX.hw + 0.4);
  return { x: Math.floor(probeX), y: Math.floor(probeY) };
}
