// Starts the game. Phaser is loaded as a plain script in index.html, so it is the global `Phaser` here.
import { WIDTH, HEIGHT, FONT, COLORS } from "./config.js";
import { Boot } from "./scenes/Boot.js";
import { Title } from "./scenes/Title.js";

// Text is drawn onto canvases, so the pixel font must be loaded first. Don't wait forever if it can't load (offline).
async function fontReady() {
  try {
    await Promise.race([document.fonts.load(`8px ${FONT}`), new Promise(r => setTimeout(r, 2500))]);
  } catch { /* fall back to monospace */ }
}

await fontReady();

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: COLORS.bg,
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Title],
});

// Re-fit whenever the page area changes size (phone rotation, toolbars, a window that started out hidden).
new ResizeObserver(() => window.game.scale.refresh()).observe(document.getElementById("game"));

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service worker not registered:", err));
}
