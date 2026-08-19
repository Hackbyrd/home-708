import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    HOST: z.string().default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATA_DIR: z.string().min(1).optional(),
    BODY_LIMIT_BYTES: z.coerce
      .number()
      .int()
      .min(1_024)
      .max(10_000_000)
      .default(1_000_000),
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .passthrough();

export type ServerEnv = z.infer<typeof envSchema>;

export function readEnv(input: NodeJS.ProcessEnv = process.env): ServerEnv {
  return envSchema.parse(input);
}
