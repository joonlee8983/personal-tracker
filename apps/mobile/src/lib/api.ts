import type { Item, ApiResponse, UserSettings } from "@todo/shared";
import { getAuthHeader, refreshAccessToken, logout } from "./auth";
import { offlineQueue } from "./storage";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

interface RequestOptions {
  method?: string;
  body?: unknown;
  isFormData?: boolean;
  skipAuth?: boolean;
}

/**
 * Make an authenticated API request with auto-refresh on 401
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, isFormData = false, skipAuth = false } = options;

  try {
    const headers: Record<string, string> = {};

    if (!skipAuth) {
      const authHeader = await getAuthHeader();
      if (!authHeader) {
        return { success: false, error: "Not authenticated" };
      }
      headers.Authorization = authHeader.Authorization;
    }

    if (!isFormData && body) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });

    // Handle 401 - try to refresh and retry once
    if (response.status === 401 && !skipAuth) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the request
        const newAuthHeader = await getAuthHeader();
        if (newAuthHeader) {
          headers.Authorization = newAuthHeader.Authorization;
          const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
          });

          if (retryResponse.ok) {
            const data = await retryResponse.json();
            return { success: true, data };
          }
        }
      }

      // Refresh failed, logout
      await logout();
      return { success: false, error: "Session expired" };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `Error ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`API request error (${endpoint}):`, error);

    // Queue for offline retry if it's a mutation
    if (method !== "GET" && !skipAuth) {
      await offlineQueue.add({ endpoint, method, body });
    }

    return { success: false, error: "Network error" };
  }
}

// ============ Items API ============

export interface ItemsFilter {
  type?: string;
  status?: string;
  needsReview?: boolean;
  dueFrom?: string;
  dueTo?: string;
  search?: string;
  priority?: string;
}

export async function fetchItems(filters?: ItemsFilter): Promise<ApiResponse<{ items: Item[] }>> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
  }
  const query = params.toString();
  return apiRequest(`/api/mobile/items${query ? `?${query}` : ""}`);
}

export async function fetchItem(id: string): Promise<ApiResponse<{ item: Item }>> {
  return apiRequest(`/api/mobile/items/${id}`);
}

export async function updateItem(
  id: string,
  updates: Partial<Item>
): Promise<ApiResponse<{ item: Item }>> {
  return apiRequest(`/api/mobile/items/${id}`, {
    method: "PATCH",
    body: updates,
  });
}

export async function deleteItem(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return apiRequest(`/api/mobile/items/${id}`, {
    method: "DELETE",
  });
}

// ============ Ingest API ============

export async function ingestText(
  text: string
): Promise<ApiResponse<{ item: Item; needsReview: boolean }>> {
  return apiRequest("/api/mobile/ingest/text", {
    method: "POST",
    body: { text },
  });
}

export async function ingestVoice(
  audioUri: string,
  mimeType: string
): Promise<ApiResponse<{ item: Item; transcription: string; needsReview: boolean }>> {
  const formData = new FormData();

  // @ts-expect-error - React Native FormData accepts this format
  formData.append("audio", {
    uri: audioUri,
    type: mimeType,
    name: `recording.${mimeType.split("/")[1] || "m4a"}`,
  });

  return apiRequest("/api/mobile/ingest/voice", {
    method: "POST",
    body: formData,
    isFormData: true,
  });
}

// ============ Settings API ============

export async function fetchSettings(): Promise<ApiResponse<{ settings: UserSettings }>> {
  return apiRequest("/api/mobile/settings");
}

export async function updateSettings(
  updates: Partial<UserSettings>
): Promise<ApiResponse<{ settings: UserSettings }>> {
  return apiRequest("/api/mobile/settings", {
    method: "PATCH",
    body: updates,
  });
}

// ============ Push API ============

export async function registerPushToken(
  expoPushToken: string,
  platform: "ios" | "android",
  deviceName?: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiRequest("/api/push/register", {
    method: "POST",
    body: { expoPushToken, platform, deviceName },
  });
}

export async function unregisterPushToken(
  expoPushToken: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiRequest("/api/push/unregister", {
    method: "POST",
    body: { expoPushToken },
  });
}

export async function testPushNotification(): Promise<ApiResponse<{ success: boolean }>> {
  return apiRequest("/api/push/test", {
    method: "POST",
  });
}

// ============ Offline Queue Processing ============

export async function processOfflineQueue(): Promise<void> {
  const queue = await offlineQueue.getAll();

  for (const request of queue) {
    try {
      const response = await apiRequest(request.endpoint, {
        method: request.method,
        body: request.body,
      });

      if (response.success) {
        await offlineQueue.remove(request.id);
      }
    } catch {
      // Keep in queue for next retry
    }
  }
}

