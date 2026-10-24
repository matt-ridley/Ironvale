/* Service worker: lets the game install and open with no signal.
   - Game files (this site): network first, so a new version shows up as soon as there is signal,
     falling back to the saved copy after a few seconds or when offline.
   - Phaser and the pixel font: saved copy first. Phaser's URL includes its version, so it never changes. */
const VERSION = "0.44.0"; // keep the same as src/config.js (a test checks)
const SHELL = `ironvale-shell-${VERSION}`;
const STATIC = "ironvale-static-v1";
const PHASER = "https://cdnjs.cloudflare.com/ajax/libs/phaser/3.90.0/phaser.min.js";
const APP_FILES = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "src/main.js", "src/config.js",
  "src/art/pixels.js", "src/art/sprites.js", "src/art/tiles.js", "src/art/terrain.js", "src/art/monsters.js", "src/art/hero.js", "src/art/megan.js",
  "src/audio/sound.js", "src/audio/tracks.js",
  "src/data/items.js", "src/data/monsters.js",
  "src/rules/character.js", "src/rules/checks.js", "src/rules/combat.js", "src/rules/dice.js", "src/rules/items.js", "src/rules/gear.js", "src/rules/bank.js", "src/rules/party.js", "src/rules/bestiary.js", "src/rules/conditions.js", "src/rules/magic.js", "src/rules/tactics.js", "src/world/ironvale.js", "src/world/keep.js", "src/world/pass.js", "src/world/gatehouse.js", "src/world/beyond.js", "src/story/hero.js", "src/story/bounties.js", "src/story/talks.js", "src/story/rewards.js", "src/story/act3.js", "src/story/act4.js", "src/art/robyn.js", "src/art/rachel.js", "src/art/claire.js", "src/art/matt.js", "src/data/spells.js",
  "src/scenes/Boot.js", "src/scenes/Title.js", "src/scenes/World.js", "src/scenes/Battle.js", "src/scenes/Inventory.js", "src/scenes/Shop.js", "src/scenes/Bank.js", "src/scenes/Dialogue.js", "src/scenes/Meet.js", "src/scenes/Hud.js", "src/scenes/Quests.js", "src/scenes/WorldMap.js", "src/scenes/LevelUp.js", "src/scenes/NameEntry.js", "src/scenes/Cheats.js", "src/rules/cheats.js", "src/scenes/minigames.js", "src/scenes/Oath.js", "src/rules/minigames.js", "src/rules/oaths.js", "src/story/minigames.js",
  "src/story/dialogue.js", "src/story/scripts.js", "src/story/quests.js",
  "src/state/game.js", "src/state/save.js", "src/ui/joystick.js", "src/ui/widgets.js", "src/ui/stage.js", "src/world/map.js", "src/world/maps.js", "src/world/overworld.js", "src/world/cave.js", "src/world/houses.js", "src/world/travel.js", "src/world/encounters.js", "src/world/movement.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];
const NETWORK_WAIT_MS = 3500;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll(APP_FILES.map(u => new Request(u, { cache: "reload" })));
    const stat = await caches.open(STATIC);
    await Promise.allSettled([stat.add(PHASER)]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (![SHELL, STATIC].includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isStatic = url => url.href === PHASER || url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com";

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(networkFirst(req));
  else if (isStatic(url)) e.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const shell = await caches.open(SHELL);
  // "no-cache" asks the server whether the file changed (cheap when it hasn't), so new versions arrive at once.
  const fromNetwork = fetch(req, { cache: "no-cache" }).then(res => {
    if (res.ok) shell.put(req, res.clone());
    return res;
  });
  fromNetwork.catch(() => {}); // a late failure after the saved copy was used is fine
  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_WAIT_MS));
  try {
    const res = await Promise.race([fromNetwork, timeout]);
    if (res) return res;
  } catch { /* offline: use the saved copy */ }
  const saved = await shell.match(req, { ignoreSearch: true });
  return saved || fromNetwork;
}

async function cacheFirst(req) {
  const stat = await caches.open(STATIC);
  const saved = await stat.match(req);
  if (saved) return saved;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") stat.put(req, res.clone());
  return res;
}
