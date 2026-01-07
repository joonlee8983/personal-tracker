// Item types
export type ItemType = "todo" | "reminder" | "idea" | "note";
export type ItemStatus = "active" | "done" | "archived";
export type Priority = "P0" | "P1" | "P2";
export type SourceType = "text" | "voice" | "telegram";

// Item interface matching Prisma model
export interface Item {
  id: string;
  userId: string;
  type: ItemType;
  title: string;
  details: string | null;
  status: ItemStatus;
  dueAt: string | null; // ISO string
  priority: Priority | null;
  tags: string[];
  sourceType: SourceType;
  sourceText: string;
  sourceAudioUrl: string | null;
  needsReview: boolean;
  agentConfidence: number | null;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface MobileAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until accessToken expires
}

export interface TokenPayload {
  userId: string;
  type: "access" | "refresh";
  deviceId?: string;
  iat: number;
  exp: number;
}

// Push notification types
export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// User settings
export interface UserSettings {
  dailyDigestEnabled: boolean;
  dailyDigestTime: string; // HH:MM format
  timezone: string; // IANA timezone
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ItemsResponse {
  items: Item[];
}

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

