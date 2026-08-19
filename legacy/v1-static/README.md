# City Home 3D v1 (frozen)

This directory is the preserved static prototype from July 27, 2026. It is
reference-only; production development happens in the workspace root.

## Run

```sh
npx -y http-server legacy/v1-static -p 8123 -c-1
```

Then open <http://localhost:8123>. The snapshot uses the included package lock;
run `npm install` inside this directory if its local `node_modules` is absent.

## Layout backup

Before moving a browser profile to v2, use **Export** in this legacy app. The
v2 migration screen accepts `city-home-layout.json` and validates every entry
before saving it to the server.
