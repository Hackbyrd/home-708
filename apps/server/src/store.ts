import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, unlink } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import {
  API_VERSION,
  LAYOUT_VERSION,
  appConfigSchema,
  layoutSchema,
  layoutSummarySchema,
  type AppConfig,
  type AppConfigUpdate,
  type Layout,
  type LayoutCreate,
  type LayoutSummary,
  type LayoutUpdate,
} from "@city-home/shared";
import { ApiError, NotFoundError, RevisionConflictError } from "./errors.js";

const SEEDED_AT = "2026-07-27T00:00:00.000Z";

const seedLayout: Layout = {
  version: LAYOUT_VERSION,
  id: "default",
  name: "Default layout",
  revision: 0,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
  edits: {},
  added: [],
  rooms: {},
  walls: {},
};

const seedConfig: AppConfig = {
  version: API_VERSION,
  revision: 0,
  siteName: "The City Home 3D",
  activeLayoutId: "default",
  allowLocalDrafts: true,
  defaultSeason: "summer",
  graphicsPreset: "balanced",
  autoOrbit: true,
  layoutAuthority: "server",
  updatedAt: SEEDED_AT,
};

export class JsonStore {
  readonly root: string;
  readonly layoutsDirectory: string;
  readonly configPath: string;
  #writeQueue: Promise<void> = Promise.resolve();

  constructor(root: string) {
    this.root = resolve(root);
    this.layoutsDirectory = resolve(this.root, "layouts");
    this.configPath = resolve(this.root, "config.json");
  }

  async initialize(): Promise<void> {
    await mkdir(this.layoutsDirectory, { recursive: true });
    await this.#seedIfMissing(this.configPath, seedConfig);
    await this.#seedIfMissing(this.#layoutPath("default"), seedLayout);
  }

  async getConfig(): Promise<AppConfig> {
    return this.#read(this.configPath, appConfigSchema);
  }

  async updateConfig(update: AppConfigUpdate): Promise<AppConfig> {
    return this.#serialize(async () => {
      const current = await this.getConfig();
      this.#assertRevision(update.revision, current.revision);
      const next = appConfigSchema.parse({
        ...current,
        ...update,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      });
      await this.#atomicWrite(this.configPath, next);
      return next;
    });
  }

  async listLayouts(): Promise<LayoutSummary[]> {
    const config = await this.getConfig();
    const files = (await readdir(this.layoutsDirectory))
      .filter((file) => file.endsWith(".json"))
      .sort();
    const layouts = await Promise.all(
      files.map((file) =>
        this.#read(resolve(this.layoutsDirectory, file), layoutSchema),
      ),
    );
    return layouts
      .map((layout) =>
        layoutSummarySchema.parse({
          id: layout.id,
          name: layout.name,
          revision: layout.revision,
          createdAt: layout.createdAt,
          updatedAt: layout.updatedAt,
          active: layout.id === config.activeLayoutId,
        }),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getLayout(id: string): Promise<Layout> {
    return this.#read(this.#layoutPath(id), layoutSchema, `Layout '${id}'`);
  }

  async getActiveLayout(): Promise<Layout> {
    const config = await this.getConfig();
    if (!config.activeLayoutId) throw new NotFoundError("Active layout");
    return this.getLayout(config.activeLayoutId);
  }

  async createLayout(input: LayoutCreate): Promise<Layout> {
    return this.#serialize(async () => {
      const id = input.id ?? this.#newId(input.name);
      const path = this.#layoutPath(id);
      if (await this.#exists(path)) {
        throw new ApiError(409, "LAYOUT_EXISTS", `Layout '${id}' already exists`);
      }
      const now = new Date().toISOString();
      const layout = layoutSchema.parse({
        version: LAYOUT_VERSION,
        id,
        name: input.name,
        revision: 0,
        createdAt: now,
        updatedAt: now,
        ...input.data,
      });
      await this.#atomicWrite(path, layout);
      return layout;
    });
  }

  async updateLayout(id: string, update: LayoutUpdate): Promise<Layout> {
    return this.#serialize(async () => {
      const current = await this.getLayout(id);
      this.#assertRevision(update.revision, current.revision);
      const next = layoutSchema.parse({
        ...current,
        ...(update.name === undefined ? {} : { name: update.name }),
        ...(update.data ?? {}),
        id: current.id,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      });
      await this.#atomicWrite(this.#layoutPath(id), next);
      return next;
    });
  }

  async deleteLayout(id: string, revision?: number): Promise<void> {
    await this.#serialize(async () => {
      const current = await this.getLayout(id);
      if (revision !== undefined) {
        this.#assertRevision(revision, current.revision);
      }
      const config = await this.getConfig();
      if (config.activeLayoutId === id) {
        throw new ApiError(
          409,
          "ACTIVE_LAYOUT",
          "Select another active layout before deleting this one",
        );
      }
      await unlink(this.#layoutPath(id));
    });
  }

  async activateLayout(id: string, configRevision: number): Promise<AppConfig> {
    return this.#serialize(async () => {
      await this.getLayout(id);
      const current = await this.getConfig();
      this.#assertRevision(configRevision, current.revision);
      const next = appConfigSchema.parse({
        ...current,
        activeLayoutId: id,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      });
      await this.#atomicWrite(this.configPath, next);
      return next;
    });
  }

  #layoutPath(id: string): string {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id)) {
      throw new ApiError(400, "INVALID_ID", "Invalid layout identifier");
    }
    const path = resolve(this.layoutsDirectory, `${id}.json`);
    if (!path.startsWith(`${this.layoutsDirectory}${sep}`)) {
      throw new ApiError(400, "INVALID_PATH", "Unsafe layout path");
    }
    return path;
  }

  #newId(name: string): string {
    const prefix =
      name
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 55) || "layout";
    return `${prefix}-${randomUUID().slice(0, 8)}`;
  }

  #assertRevision(expected: number, actual: number): void {
    if (expected !== actual) throw new RevisionConflictError(expected, actual);
  }

  async #seedIfMissing(path: string, value: unknown): Promise<void> {
    if (!(await this.#exists(path))) await this.#atomicWrite(path, value);
  }

  async #exists(path: string): Promise<boolean> {
    try {
      await readFile(path);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  }

  async #read<T>(
    path: string,
    schema: { parse(value: unknown): T },
    resource = "Resource",
  ): Promise<T> {
    try {
      const json: unknown = JSON.parse(await readFile(path, "utf8"));
      return schema.parse(json);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new NotFoundError(resource);
      }
      throw error;
    }
  }

  async #atomicWrite(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await rename(temporary, path);
      const directory = await open(dirname(path), "r");
      try {
        await directory.sync();
      } finally {
        await directory.close();
      }
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }

  async #serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#writeQueue.then(operation, operation);
    this.#writeQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
