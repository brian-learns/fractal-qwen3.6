# Fractal Generator — Agent Instructions

## Project Structure
- Single-page app, **no build tools, no framework**. Three source files: `index.html`, `script.js`, `styles.css`
- PWA assets: `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`
- All fractal rendering is in `script.js` (canvas/WebGL, ~760 lines)

## Running Locally
Must serve over HTTP (not `file://`). Requires PWA and service worker:
```bash
python3 -m http.server 8080
# or npx serve .
```

## PWA / Mobile
- Service worker at `sw.js` caches app shell. Update `CACHE_NAME` to bust cache.
- Viewport must **not** use `user-scalable=no` — fractal exploration requires pinch-to-zoom.
- Canvas has `touch-action: none` in CSS; panning/zooming handled by JS touch events.
- Icons are PNGs, not SVGs. Edit `script.js` if replacing them.

## Deployment
- Push to `main` → GitHub Actions builds/deploy to GitHub Pages.
- Ensure `manifest.json` and `sw.js` are in root for Pages deployment.

## Gotchas
- Presets saved to `localStorage` under key `"fractalPresets"`.
- No linter, no tests, no formatter. Verify changes by opening in browser.
- `script.js` uses `requestAnimationFrame` for animation loop — don't mix `setInterval`.
- Julia set controls are hidden unless `fractal-type` is set to `"julia"`.
