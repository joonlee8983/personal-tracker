import { z } from "zod";

// Enum schemas
export const ItemTypeSchema = z.enum(["todo", "reminder", "idea", "note"]);
export const ItemStatusSchema = z.enum(["active", "done", "archived"]);
export const PrioritySchema = z.enum(["P0", "P1", "P2"]);
export const SourceTypeSchema = z.enum(["text", "voice", "telegram"]);

// Text ingest request
export const TextIngestRequestSchema = z.object({
  text: z.string().min(1).max(5000),
});

// Item filter params
export const ItemFilterSchema = z.object({
  type: ItemTypeSchema.optional(),
  status: ItemStatusSchema.optional(),
  needsReview: z.boolean().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  search: z.string().optional(),
  priority: PrioritySchema.optional(),
});

// Item update schema
export const ItemUpdateSchema = z.object({
  type: ItemTypeSchema.optional(),
  title: z.string().min(1).max(200).optional(),
  details: z.string().nullable().optional(),
  status: ItemStatusSchema.optional(),
  dueAt: z.string().nullable().optional(),
  priority: PrioritySchema.nullable().optional(),
  tags: z.array(z.string()).optional(),
  needsReview: z.boolean().optional(),
});

// Device code exchange
export const DeviceCodeExchangeSchema = z.object({
  code: z.string().min(6).max(10),
});

// Refresh token request
export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

// Push token registration
export const PushTokenRegisterSchema = z.object({
  expoPushToken: z.string().min(1),
  platform: z.enum(["ios", "android"]),
  deviceName: z.string().optional(),
});

// User settings update
export const UserSettingsUpdateSchema = z.object({
  dailyDigestEnabled: z.boolean().optional(),
  dailyDigestTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  timezone: z.string().optional(),
});

// Agent classification output schema
export const AgentClassificationSchema = z.object({
  type: ItemTypeSchema,
  title: z.string().min(1).max(200),
  details: z.string().default(""),
  dueAt: z.string().nullable().default(null),
  priority: PrioritySchema.nullable().default(null),
  tags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  followUpQuestions: z.array(z.string()).default([]),
});

export type AgentClassification = z.infer<typeof AgentClassificationSchema>;
export type TextIngestRequest = z.infer<typeof TextIngestRequestSchema>;
export type ItemFilter = z.infer<typeof ItemFilterSchema>;
export type ItemUpdate = z.infer<typeof ItemUpdateSchema>;
export type DeviceCodeExchange = z.infer<typeof DeviceCodeExchangeSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type PushTokenRegister = z.infer<typeof PushTokenRegisterSchema>;
export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdateSchema>;

