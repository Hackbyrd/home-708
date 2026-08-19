# Deployment and operations

## Security setup

1. Generate an owner password hash with the server workspace script.
2. Generate `COOKIE_SECRET` with `openssl rand -hex 32`.
3. Set `PUBLIC_ORIGIN` to the exact HTTPS origin.
4. Keep all secrets in the host secret manager or `.env`; never add them to
   `apps/server/data/config.json`.

All read routes are public. Login, config mutation, layout mutation, imports,
and active-layout changes require the signed owner session.

## Persistent data

Mount a durable volume at `/data`. The server writes:

- `config.json`
- `active-layout.json`
- `layouts/<id>.json`
- `backups/` during imports and migrations

Writes use a temporary sibling file followed by an atomic rename. Take
filesystem snapshots or copy `/data` while the service is stopped. Restore by
replacing the volume contents and restarting the container.

## Health and rollout

`GET /api/health` is the liveness endpoint. Deploy the image only after its
typecheck, tests, and production build pass. Use a persistent-volume host
(a VPS, Fly volume, or Railway volume); ephemeral/serverless filesystems will
lose layouts.
