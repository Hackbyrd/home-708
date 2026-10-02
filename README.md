# home-708

A Vue 3 and Three.js digital twin of the City Home with a browser-local layout
editor and a static Cloudflare Pages deployment.

## Requirements

- Node.js 22+
- npm 10+

## Local development

```sh
npm install
npm run dev
```

The Vue development server runs at `http://localhost:5173`. Save writes only to
that browser's `localStorage`; Export downloads a portable JSON backup, Import
restores one, and Reset layout replaces the draft with the untouched layout.

## Reference photos and blueprint

The control panel's **Photos & blueprint** button opens a viewer for the
Crown Georgetown listing photos in `assets/Crown Georgetown Photos` and the
four-page `assets/cf_city_home_with_georgetown_pkg.pdf` floor plan package.
Vite bundles both straight from `assets/`, so dropping another `.webp` into
that folder adds it to the gallery on the next build.

## Quality checks

The View section includes Smooth, Balanced and Detailed graphics presets.
Balanced is the default; Detailed adds finer shadows and ambient occlusion.
See [graphics implementation](docs/graphics.md) for materials, geometry and rendering details.

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Cloudflare deployment

```sh
npx wrangler login
npm run deploy:cloudflare
```

`wrangler.jsonc` deploys `apps/web/dist` to the `home-708` Cloudflare Pages
project with SPA fallback routing. No database, R2 bucket, API, secrets, or
writable server filesystem are required.

Use `npm run preview:cloudflare` to test the production build locally. The
intended custom domain is `708.hackbyrd.com`, configured through an external
DNS CNAME pointing to `home-708-7zy.pages.dev`.

Pushes to `main` run the full GitHub Actions verification suite and deploy the
frontend after it passes. The repository's `production` environment requires
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` secrets.

Layout edits do not synchronize between browsers or devices. Export the JSON
configuration whenever you want a transferable backup. The Wormald
blueprint-derived model is for personal use.

## Legacy project

The original no-build static app is frozen at
[`legacy/v1-static`](legacy/v1-static/README.md), including source, plans, and
reference photos. Export existing browser layouts there before importing them
through the v2 migration screen.
