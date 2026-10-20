// Game-wide settings. Bump VERSION with every change, and keep sw.js's VERSION the same (a test checks).
export const VERSION = "0.23.0";
export const TITLE = "Ironvale"; // placeholder name

// Menus and text are laid out on a 480 x 270 grid. The canvas has twice that many pixels (ZOOM), so the world and
// the sprites can show 16-bit detail while menus look as before (their cameras zoom 2x). It is then scaled to fit.
export const WIDTH = 480;
export const HEIGHT = 270;
export const ZOOM = 2;
export const TILE = 32; // world tile size in canvas pixels (16-bit detail)
export const WORLD_ZOOM = 1.5; // the world camera is a little closer, about 20 x 11 tiles on screen, so the hero is bigger

export const FONT = '"Press Start 2P", monospace';

export const COLORS = {
  bg: 0x1b1b2f,
  ground: 0x2e4d2a,
  groundDark: 0x24391f,
  panel: 0x2a2a44,
  panelEdge: 0x4a4a6a,
  gold: "#e8b923",
  text: "#e8e6df",
  dim: "#8c8aa0",
  good: "#7bc96f",
  bad: "#e0645c",
};
