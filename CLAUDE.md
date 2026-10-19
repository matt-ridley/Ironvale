# Ironvale

A pixel-art d20 adventure for phones: plain HTML, CSS and JavaScript modules with no build step, Phaser 3 from a CDN, hosted on GitHub Pages (built from `main`). The README has the features, controls and layout.

## The owner works from the Claude phone app

Everything must be doable through commits, pull requests and merges. Never hand the owner a step that needs a computer or a terminal.

## When a change is done, merge it

Open a pull request and merge it yourself once the tests pass and you've checked the change. Don't wait to be asked. Merging into `main` deploys the game through GitHub Pages ("pages build and deployment"). Check that run is green before saying a change is live.

## Conventions

- Bump `VERSION` in both `src/config.js` and `sw.js` for game changes (minor for a feature, patch for a fix; a test checks they match). Docs-only changes don't need a bump.
- A new file under `src/` goes in `APP_FILES` in `sw.js`, or the game won't have it offline (a test checks).
- Run `npm test` before pushing.
