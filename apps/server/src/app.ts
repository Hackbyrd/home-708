import { fileURLToPath } from "node:url";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import Fastify, {
  type FastifyInstance,
} from "fastify";
import { ZodError, z } from "zod";
import {
  appConfigUpdateSchema,
  layoutCreateSchema,
  layoutImportSchema,
  layoutUpdateSchema,
} from "@city-home/shared";
import { ApiError } from "./errors.js";
import { readEnv, type ServerEnv } from "./env.js";
import { JsonStore } from "./store.js";

const layoutIdParams = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
});

export interface BuildAppOptions {
  env?: ServerEnv;
  store?: JsonStore;
  logger?: boolean;
}

function layoutEnvelope(data: unknown) {
  return {
    data,
    authority: "server" as const,
    localDraftPolicy: "client-may-draft-server-wins" as const,
  };
}

export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const env = options.env ?? readEnv();
  const store =
    options.store ??
    new JsonStore(
      env.DATA_DIR ??
        fileURLToPath(new URL("../data", import.meta.url)),
    );
  await store.initialize();

  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV !== "test",
    bodyLimit: env.BODY_LIMIT_BYTES,
    trustProxy: env.TRUST_PROXY,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: z.treeifyError(error),
        },
      });
    }
    if (error && typeof error === "object" && "statusCode" in error) {
      const httpError = error as { statusCode?: number; message?: string };
      if (typeof httpError.statusCode !== "number" || httpError.statusCode >= 500) {
        app.log.error(error);
        return reply.status(500).send({
          error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        });
      }
      return reply.status(httpError.statusCode).send({
        error: {
          code: "BAD_REQUEST",
          message: httpError.message ?? "Bad request",
        },
      });
    }
    app.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  });

  app.get("/api/health", async () => ({
    ok: true,
    service: "city-home-server",
    version: "v2",
    timestamp: new Date().toISOString(),
  }));

  app.get("/api/config", async (_request, reply) => {
    reply.header("Cache-Control", "no-cache");
    return { data: await store.getConfig(), authority: "server" };
  });

  app.get("/api/layouts", async (_request, reply) => {
    reply.header("Cache-Control", "no-cache");
    return { data: await store.listLayouts(), authority: "server" };
  });

  app.get("/api/layouts/active", async (_request, reply) => {
    const layout = await store.getActiveLayout();
    reply.header("ETag", `"layout-${layout.id}-${layout.revision}"`);
    return layoutEnvelope(layout);
  });

  app.get("/api/layouts/:id", async (request, reply) => {
    const { id } = layoutIdParams.parse(request.params);
    const layout = await store.getLayout(id);
    reply.header("ETag", `"layout-${layout.id}-${layout.revision}"`);
    return layoutEnvelope(layout);
  });

  app.put(
    "/api/config",
    async (request) => ({
      data: await store.updateConfig(appConfigUpdateSchema.parse(request.body)),
      authority: "server",
    }),
  );

  app.post(
    "/api/layouts",
    async (request, reply) => {
      const layout = await store.createLayout(
        layoutCreateSchema.parse(request.body),
      );
      return reply.status(201).send(layoutEnvelope(layout));
    },
  );

  app.put(
    "/api/layouts/:id",
    async (request) => {
      const { id } = layoutIdParams.parse(request.params);
      return layoutEnvelope(
        await store.updateLayout(id, layoutUpdateSchema.parse(request.body)),
      );
    },
  );

  app.delete(
    "/api/layouts/:id",
    async (request, reply) => {
      const { id } = layoutIdParams.parse(request.params);
      const query = z
        .object({ revision: z.coerce.number().int().nonnegative().optional() })
        .parse(request.query);
      await store.deleteLayout(id, query.revision);
      return reply.status(204).send();
    },
  );

  app.post(
    "/api/layouts/:id/activate",
    async (request) => {
      const { id } = layoutIdParams.parse(request.params);
      const { revision } = z
        .object({ revision: z.number().int().nonnegative() })
        .strict()
        .parse(request.body);
      return {
        data: await store.activateLayout(id, revision),
        authority: "server",
      };
    },
  );

  app.post(
    "/api/layouts/import",
    async (request, reply) => {
      const input = layoutImportSchema.parse(request.body);
      const layout = await store.createLayout(input);
      return reply.status(201).send(layoutEnvelope(layout));
    },
  );

  if (env.NODE_ENV === "production") {
    await app.register(fastifyStatic, {
      root: fileURLToPath(new URL("../../web/dist", import.meta.url)),
      prefix: "/",
    });
  }

  return app;
}
