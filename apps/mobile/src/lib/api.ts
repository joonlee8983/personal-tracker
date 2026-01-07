import { supabase } from "./supabase";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    return {};
  }
  
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };

  if (!skipAuth) {
    const authHeaders = await getAuthHeaders();
    Object.assign(headers, authHeaders);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Items API
export const itemsApi = {
  list: (params?: { status?: string; type?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.search) searchParams.set("search", params.search);
    const query = searchParams.toString();
    return apiRequest<{ items: unknown[] }>(`/api/items${query ? `?${query}` : ""}`);
  },

  get: (id: string) => apiRequest<{ item: unknown }>(`/api/items/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    apiRequest<{ item: unknown }>(`/api/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/items/${id}`, {
      method: "DELETE",
    }),
};

// Ingest API
export const ingestApi = {
  text: (text: string) =>
    apiRequest<{ item: unknown; classification: unknown }>("/api/ingest/text", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  voice: async (audioUri: string, filename: string) => {
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
      throw new Error(error.error || "Failed to upload voice memo");
    }

    return response.json();
  },
};

// Push notifications API
export const pushApi = {
  register: (token: string, platform: string, deviceName?: string) =>
    apiRequest("/api/push/register", {
      method: "POST",
      body: JSON.stringify({ expoPushToken: token, platform, deviceName }),
    }),

  unregister: (token: string) =>
    apiRequest("/api/push/unregister", {
      method: "POST",
      body: JSON.stringify({ expoPushToken: token }),
    }),

  test: () => apiRequest("/api/push/test", { method: "POST" }),
};
