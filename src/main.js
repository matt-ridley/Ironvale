// Starts the game. Phaser is loaded as a plain script in index.html, so it is the global `Phaser` here.
import { WIDTH, HEIGHT, ZOOM, FONT, COLORS } from "./config.js";
import { Boot } from "./scenes/Boot.js";
import { Title } from "./scenes/Title.js";
import { World } from "./scenes/World.js";
import { Battle } from "./scenes/Battle.js";
import { Inventory } from "./scenes/Inventory.js";
import { Shop } from "./scenes/Shop.js";
import { Bank } from "./scenes/Bank.js";
import { Dialogue } from "./scenes/Dialogue.js";
import { Meet } from "./scenes/Meet.js";
import { Quests } from "./scenes/Quests.js";
import { Hud } from "./scenes/Hud.js";
import { unlockAudio } from "./audio/sound.js";
import { restoreSave, autosave } from "./state/game.js";

// Text is drawn onto canvases, so the pixel font must be loaded first. Don't wait forever if it can't load (offline).
async function fontReady() {
  try {
    await Promise.race([document.fonts.load(`8px ${FONT}`), new Promise(r => setTimeout(r, 2500))]);
  } catch { /* fall back to monospace */ }
}

await fontReady();
restoreSave(); // pick up where you left off; the title screen offers CONTINUE

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH * ZOOM,
  height: HEIGHT * ZOOM,
  backgroundColor: COLORS.bg,
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Title, World, Hud, Battle, Inventory, Shop, Bank, Dialogue, Meet, Quests], // later ones draw on top
});

// Browsers only allow sound after a tap or key press.
for (const ev of ["pointerdown", "keydown", "touchend"]) document.addEventListener(ev, unlockAudio, { passive: true });

// Phones can close a home-screen app at any moment once it's in the background, so save on the way out.
// (Not from the title screen, so just opening the game never creates a save.)
const saveIfPlaying = () => { if (!window.game.scene.isActive("Title")) autosave(); };
document.addEventListener("visibilitychange", () => { if (document.hidden) saveIfPlaying(); });
window.addEventListener("pagehide", saveIfPlaying);

// Re-fit whenever the page area changes size (phone rotation, toolbars, a window that started out hidden).
new ResizeObserver(() => window.game.scale.refresh()).observe(document.getElementById("game"));

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(err => console.warn("Service worker not registered:", err));
}
