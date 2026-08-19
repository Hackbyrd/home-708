import { z } from "zod";

export const API_VERSION = "v2" as const;
export const LAYOUT_VERSION = 2 as const;

const finiteNumber = z.number().finite();
const timestamp = z.string().datetime({ offset: true });
const identifier = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "Invalid identifier");

export const layoutEditSchema = z
  .object({
    x: finiteNumber.optional(),
    y: finiteNumber.optional(),
    z: finiteNumber.optional(),
    rot: finiteNumber.optional(),
    flip: z.boolean().optional(),
    sx: finiteNumber.positive().optional(),
    sy: finiteNumber.positive().optional(),
    sz: finiteNumber.positive().optional(),
    hidden: z.boolean().optional(),
    mat: z.string().max(100).optional(),
    accent: z.string().max(100).optional(),
  })
  .strict();

export const addedItemSchema = z
  .object({
    aid: identifier,
    kind: z.string().min(1).max(100).optional(),
    src: z.string().min(1).max(250).optional(),
    args: z.array(z.json()).max(100).optional(),
    level: z.number().int().min(0).max(3),
    x: finiteNumber,
    y: finiteNumber.optional(),
    z: finiteNumber,
    rot: finiteNumber.optional(),
    flip: z.boolean().optional(),
    sx: finiteNumber.positive().optional(),
    sy: finiteNumber.positive().optional(),
    sz: finiteNumber.positive().optional(),
    mat: z.string().max(100).optional(),
    accent: z.string().max(100).optional(),
    modules: z.array(z.json()).max(100).optional(),
  })
  .passthrough()
  .refine((item) => item.kind !== undefined || item.src !== undefined, {
    message: "An added item must have a kind or source item",
  });

export const roomOverrideSchema = z
  .object({
    floor: z.string().min(1).max(100),
  })
  .strict();

export const wallOverrideSchema = z
  .object({
    paint: z.string().min(1).max(100),
    src: z.string().max(200).optional(),
  })
  .strict();

/**
 * The editor override layer. This intentionally matches the legacy
 * `cityhome-layout-v2` localStorage value so browser drafts can be imported
 * without changing blueprint furniture identities.
 */
export const layoutDataSchema = z
  .object({
    edits: z.record(z.string().min(1).max(250), layoutEditSchema).default({}),
    added: z.array(addedItemSchema).max(10_000).default([]),
    rooms: z
      .record(z.string().min(1).max(250), roomOverrideSchema)
      .default({}),
    walls: z
      .record(z.string().min(1).max(250), wallOverrideSchema)
      .default({}),
  })
  .strict();

export const layoutSchema = z
  .object({
    version: z.literal(LAYOUT_VERSION),
    id: identifier,
    name: z.string().trim().min(1).max(120),
    revision: z.number().int().nonnegative(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...layoutDataSchema.shape,
  })
  .strict();

export const layoutSummarySchema = layoutSchema
  .pick({
    id: true,
    name: true,
    revision: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    active: z.boolean(),
  });

const nestedLayoutCreateSchema = z
  .object({
    id: identifier.optional(),
    name: z.string().trim().min(1).max(120),
    data: layoutDataSchema,
  })
  .strict();

export const layoutDraftSchema = z
  .object({
    version: z.literal(LAYOUT_VERSION).default(LAYOUT_VERSION),
    id: identifier.optional(),
    name: z.string().trim().min(1).max(120),
    ...layoutDataSchema.shape,
  })
  .strict();

export const layoutCreateSchema = z
  .union([nestedLayoutCreateSchema, layoutDraftSchema])
  .transform((value) => {
    if ("data" in value) return value;
    const { id, name, edits, added, rooms, walls } = value;
    return { id, name, data: { edits, added, rooms, walls } };
  });

const nestedLayoutUpdateSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    name: z.string().trim().min(1).max(120).optional(),
    data: layoutDataSchema.optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.data !== undefined, {
    message: "At least one of name or data is required",
  });

const flatLayoutUpdateSchema = layoutSchema.omit({
  createdAt: true,
  updatedAt: true,
});

export const layoutUpdateSchema = z
  .union([nestedLayoutUpdateSchema, flatLayoutUpdateSchema])
  .transform((value) => {
    if ("data" in value) return value;
    const flat = value as z.infer<typeof flatLayoutUpdateSchema>;
    const { revision, name, edits, added, rooms, walls } = flat;
    return {
      revision,
      name,
      data: { edits, added, rooms, walls },
    };
  });

const legacyLayoutWrapperSchema = z.union([
  layoutDataSchema,
  z.object({ layout: layoutDataSchema }).passthrough(),
  z.object({ data: layoutDataSchema }).passthrough(),
]);

/**
 * Accepts an authoritative v2 document or a legacy local draft/wrapper.
 * Legacy values are normalized to a create payload and never treated as
 * authoritative until the server assigns identity, timestamps, and revision.
 */
export const layoutImportSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    layout: z.union([
      layoutSchema,
      layoutDraftSchema,
      legacyLayoutWrapperSchema,
    ]),
  })
  .strict()
  .transform(({ name, layout }) => {
    let result: unknown;
    if ("version" in layout && layout.version === LAYOUT_VERSION) {
      const { edits, added, rooms, walls } = layout;
      result = {
        id: layout.id,
        name: name ?? layout.name,
        data: { edits, added, rooms, walls },
      };
    } else if ("layout" in layout) {
      result = { name: name ?? "Imported layout", data: layout.layout };
    } else if (
      "data" in layout &&
      !("edits" in layout) &&
      !("added" in layout)
    ) {
      result = { name: name ?? "Imported layout", data: layout.data };
    } else {
      result = { name: name ?? "Imported layout", data: layout };
    }
    return nestedLayoutCreateSchema.parse(result);
  });

export const appConfigSchema = z
  .object({
    version: z.literal(API_VERSION),
    revision: z.number().int().nonnegative(),
    siteName: z.string().trim().min(1).max(120),
    activeLayoutId: identifier.nullable(),
    allowLocalDrafts: z.boolean(),
    defaultSeason: z.enum(["spring", "summer", "fall", "winter"]),
    graphicsPreset: z.enum(["low", "balanced", "high"]),
    autoOrbit: z.boolean(),
    layoutAuthority: z.literal("server"),
    updatedAt: timestamp,
  })
  .strict();

export const appConfigUpdateSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    siteName: z.string().trim().min(1).max(120).optional(),
    allowLocalDrafts: z.boolean().optional(),
    defaultSeason: z.enum(["spring", "summer", "fall", "winter"]).optional(),
    graphicsPreset: z.enum(["low", "balanced", "high"]).optional(),
    autoOrbit: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.siteName !== undefined ||
      value.allowLocalDrafts !== undefined ||
      value.defaultSeason !== undefined ||
      value.graphicsPreset !== undefined ||
      value.autoOrbit !== undefined,
    { message: "At least one configurable field is required" },
  );

export const healthResponseSchema = z
  .object({
    ok: z.literal(true),
    service: z.literal("city-home-server"),
    version: z.literal(API_VERSION),
    timestamp,
  })
  .strict();

export const errorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.json().optional(),
    }),
  })
  .strict();

export const configResponseSchema = z
  .object({
    data: appConfigSchema,
    authority: z.literal("server"),
  })
  .strict();

export const layoutResponseSchema = z
  .object({
    data: layoutSchema,
    authority: z.literal("server"),
    localDraftPolicy: z.literal("client-may-draft-server-wins"),
  })
  .strict();

export const layoutListResponseSchema = z
  .object({
    data: z.array(layoutSummarySchema),
    authority: z.literal("server"),
  })
  .strict();

export const layoutV2Schema = layoutSchema;
export const configSchema = appConfigSchema;

export type LayoutEdit = z.infer<typeof layoutEditSchema>;
export type AddedItem = z.infer<typeof addedItemSchema>;
export type LayoutData = z.infer<typeof layoutDataSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type LayoutDocument = Layout;
export type LayoutSummary = z.infer<typeof layoutSummarySchema>;
export type LayoutCreate = z.infer<typeof layoutCreateSchema>;
export type LayoutUpdate = z.infer<typeof layoutUpdateSchema>;
export type LayoutImport = z.infer<typeof layoutImportSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;
export type AppConfigUpdate = z.infer<typeof appConfigUpdateSchema>;
