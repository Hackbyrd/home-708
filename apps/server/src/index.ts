import { buildApp } from "./app.js";
import { readEnv } from "./env.js";

const env = readEnv();
const app = await buildApp({ env });

const close = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
};

process.once("SIGINT", () => void close("SIGINT"));
process.once("SIGTERM", () => void close("SIGTERM"));

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

export { buildApp } from "./app.js";
export { JsonStore } from "./store.js";
