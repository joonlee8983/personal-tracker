import { z } from "zod";

// Enum schemas
export const ItemTypeSchema = z.enum(["todo", "reminder", "idea", "note"]);
export const ItemStatusSchema = z.enum(["active", "done", "archived"]);
export const PrioritySchema = z.enum(["P0", "P1", "P2"]);
export const SourceTypeSchema = z.enum(["text", "voice", "telegram"]);

// Types
export type ItemType = z.infer<typeof ItemTypeSchema>;
export type ItemStatus = z.infer<typeof ItemStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;

// Agent classification output schema
export const AgentClassificationSchema = z.object({
  type: ItemTypeSchema,
  title: z.string().min(1).max(200),
  details: z.string().default(""),
  dueAt: z.string().nullable().default(null), // ISO string or null
  priority: PrioritySchema.nullable().default(null),
  tags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  followUpQuestions: z.array(z.string()).default([]),
});

export type AgentClassification = z.infer<typeof AgentClassificationSchema>;

// API request/response types
export const TextIngestRequestSchema = z.object({
  text: z.string().min(1).max(5000),
});

export type TextIngestRequest = z.infer<typeof TextIngestRequestSchema>;

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

export type ItemFilter = z.infer<typeof ItemFilterSchema>;

// Item update schema
export const ItemUpdateSchema = z.object({
  type: ItemTypeSchema.optional(),
  title: z.string().min(1).max(200).optional(),
  details: z.string().optional(),
  status: ItemStatusSchema.optional(),
  dueAt: z.string().nullable().optional(),
  priority: PrioritySchema.nullable().optional(),
  tags: z.array(z.string()).optional(),
  needsReview: z.boolean().optional(),
});

export type ItemUpdate = z.infer<typeof ItemUpdateSchema>;

// Digest types
export interface DigestData {
  date: string;
  topPriorities: DigestItem[];
  dueToday: DigestItem[];
  overdue: DigestItem[];
  totalActive: number;
}

export interface DigestItem {
  id: string;
  title: string;
  type: ItemType;
  priority: Priority | null;
  dueAt: string | null;
}

