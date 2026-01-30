import { supabase } from "./supabase";
import type { Item } from "@todo/shared";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

// Types
export interface ItemsFilter {
  status?: string;
  type?: string;
  search?: string;
  needsReview?: boolean;
  dueFrom?: string;
  dueTo?: string;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Auth helper
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return {};
  }
  
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

// Generic API request
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  try {
    const authHeaders = await getAuthHeaders();
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...authHeaders,
      ...((options.headers as Record<string, string>) || {}),
    };

    console.log(`[API] ${options.method || "GET"} ${API_BASE}${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    console.log(`[API] Response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      console.log(`[API] Error:`, error);
      return { success: false, error: error.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[API] Network error:", error);
    return { success: false, error: "Network error. Please try again." };
  }
}

// Items API
export async function fetchItems(filters?: ItemsFilter): Promise<ApiResult<{ items: Item[] }>> {
  const searchParams = new URLSearchParams();
  if (filters?.status) searchParams.set("status", filters.status);
  if (filters?.type) searchParams.set("type", filters.type);
  if (filters?.search) searchParams.set("search", filters.search);
  if (filters?.needsReview !== undefined) searchParams.set("needsReview", String(filters.needsReview));
  if (filters?.dueFrom) searchParams.set("dueFrom", filters.dueFrom);
  if (filters?.dueTo) searchParams.set("dueTo", filters.dueTo);
  
  const query = searchParams.toString();
  return apiRequest<{ items: Item[] }>(`/api/items${query ? `?${query}` : ""}`);
}

export async function getItem(id: string): Promise<ApiResult<{ item: Item }>> {
  return apiRequest<{ item: Item }>(`/api/items/${id}`);
}

export async function updateItem(id: string, data: Partial<Item>): Promise<ApiResult<{ item: Item }>> {
  return apiRequest<{ item: Item }>(`/api/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteItem(id: string): Promise<ApiResult<{ success: boolean }>> {
  return apiRequest<{ success: boolean }>(`/api/items/${id}`, {
    method: "DELETE",
  });
}

// Ingest API
export async function ingestText(text: string): Promise<ApiResult<{ item: Item }>> {
  return apiRequest<{ item: Item }>("/api/ingest/text", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function ingestVoice(audioUri: string, filename: string): Promise<ApiResult<{ item: Item; transcription: string; needsReview: boolean }>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const formData = new FormData();
    formData.append("audio", {
      uri: audioUri,
      type: "audio/m4a",
      name: filename,
    } as unknown as Blob);

    const response = await fetch(`${API_BASE}/api/ingest/voice`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Upload failed" }));
      return { success: false, error: error.error || "Failed to upload voice memo" };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[API] Voice upload error:", error);
    return { success: false, error: "Network error. Please try again." };
  }
}

// Push notifications API
export async function registerPushToken(
  token: string,
  platform: string,
  deviceName?: string
): Promise<ApiResult<void>> {
  return apiRequest("/api/push/register", {
    method: "POST",
    body: JSON.stringify({ expoPushToken: token, platform, deviceName }),
  });
}

export async function unregisterPushToken(token: string): Promise<ApiResult<void>> {
  return apiRequest("/api/push/unregister", {
    method: "POST",
    body: JSON.stringify({ expoPushToken: token }),
  });
}

export async function testPush(): Promise<ApiResult<void>> {
  return apiRequest("/api/push/test", { method: "POST" });
}

// Alias for getItem (for backward compatibility)
export const fetchItem = getItem;

// Settings API
export async function fetchSettings(): Promise<ApiResult<{ settings: any }>> {
  return apiRequest("/api/settings");
}

// Digest API
export interface DigestLog {
  id: string;
  userId: string;
  date: string;
  content: string;
  itemsIncluded: string[];
  sentVia: string;
  sentAt: string | null;
  pushSentAt: string | null;
}

export async function fetchDigest(limit: number = 7): Promise<ApiResult<{ digestLogs: DigestLog[] }>> {
  return apiRequest<{ digestLogs: DigestLog[] }>(`/api/digest?limit=${limit}`);
}

export async function fetchTodayDigest(): Promise<ApiResult<{ digest: DigestLog | null }>> {
  const result = await fetchDigest(3); // Fetch last 3 to handle timezone edge cases
  
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }
  
  const now = new Date();
  const localYear = now.getFullYear();
  const localMonth = now.getMonth();
  const localDay = now.getDate();
  
  // Find digest from today (comparing in local timezone)
  const todayDigest = result.data.digestLogs.find((d) => {
    const digestDate = new Date(d.date);
    return (
      digestDate.getFullYear() === localYear &&
      digestDate.getMonth() === localMonth &&
      digestDate.getDate() === localDay
    );
  });
  
  // If no digest for today, return the most recent one (within last 24 hours)
  if (!todayDigest && result.data.digestLogs.length > 0) {
    const latestDigest = result.data.digestLogs[0];
    const digestTime = new Date(latestDigest.sentAt || latestDigest.date).getTime();
    const hoursSinceDigest = (now.getTime() - digestTime) / (1000 * 60 * 60);
    
    if (hoursSinceDigest < 24) {
      return { success: true, data: { digest: latestDigest } };
    }
  }
  
  return { success: true, data: { digest: todayDigest || null } };
}

export async function updateSettings(data: Record<string, any>): Promise<ApiResult<{ settings: any }>> {
  return apiRequest("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Alias for testPush
export const testPushNotification = testPush;

// Legacy exports for backward compatibility
export const itemsApi = {
  list: fetchItems,
  get: getItem,
  update: updateItem,
  delete: deleteItem,
};

export const ingestApi = {
  text: ingestText,
  voice: ingestVoice,
};

export const pushApi = {
  register: registerPushToken,
  unregister: unregisterPushToken,
  test: testPush,
};
