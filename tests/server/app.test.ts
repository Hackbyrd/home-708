import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../apps/server/src/app.js";
import type { ServerEnv } from "../../apps/server/src/env.js";
import { JsonStore } from "../../apps/server/src/store.js";

const temporaryDirectories: string[] = [];

async function testApp() {
  const directory = await mkdtemp(join(tmpdir(), "city-home-server-"));
  temporaryDirectories.push(directory);
  const env: ServerEnv = {
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: 3000,
    DATA_DIR: directory,
    BODY_LIMIT_BYTES: 1_000_000,
    TRUST_PROXY: false,
  };
  return buildApp({ env, store: new JsonStore(directory), logger: false });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
});

describe("server API", () => {
  it("allows local reads and writes without authentication", async () => {
    const app = await testApp();
    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);

    const active = await app.inject({
      method: "GET",
      url: "/api/layouts/active",
    });
    expect(active.statusCode).toBe(200);
    expect(active.json().authority).toBe("server");

    const write = await app.inject({
      method: "POST",
      url: "/api/layouts",
      payload: {
        name: "Private",
        data: { edits: {}, added: [], rooms: {}, walls: {} },
      },
    });
    expect(write.statusCode).toBe(201);
    await app.close();
  });

  it("enforces revisions when saving layouts", async () => {
    const app = await testApp();
    const created = await app.inject({
      method: "POST",
      url: "/api/layouts",
      payload: {
        id: "test-layout",
        name: "Test",
        data: { edits: {}, added: [], rooms: {}, walls: {} },
      },
    });
    expect(created.statusCode).toBe(201);

    const stale = await app.inject({
      method: "PUT",
      url: "/api/layouts/test-layout",
      payload: { revision: 1, name: "Stale write" },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe("REVISION_CONFLICT");
    await app.close();
  });

  it("imports the legacy local draft wrapper", async () => {
    const app = await testApp();
    const imported = await app.inject({
      method: "POST",
      url: "/api/layouts/import",
      payload: {
        name: "Browser draft",
        layout: {
          edits: {},
          added: [],
          rooms: {},
          walls: {},
        },
      },
    });
    expect(imported.statusCode).toBe(201);
    expect(imported.json().data.name).toBe("Browser draft");
    await app.close();
  });
});
