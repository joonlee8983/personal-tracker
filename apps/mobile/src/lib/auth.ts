import { secureStorage } from "./storage";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

// In-memory storage for access token (short-lived)
let accessToken: string | null = null;
let accessTokenExpiresAt: number | null = null;

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Exchange device code for tokens
 */
export async function exchangeDeviceCode(
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/mobile/auth/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: code.toUpperCase() }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to exchange code" };
    }

    // Store tokens
    accessToken = data.accessToken;
    accessTokenExpiresAt = Date.now() + data.expiresIn * 1000 - 60000; // 1 min buffer
    await secureStorage.setRefreshToken(data.refreshToken);

    return { success: true };
  } catch (error) {
    console.error("Exchange device code error:", error);
    return { success: false, error: "Network error" };
  }
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    const response = await fetch(`${API_BASE}/api/mobile/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Refresh token is invalid, clear everything
      if (response.status === 401) {
        await logout();
      }
      return false;
    }

    // Update tokens
    accessToken = data.accessToken;
    accessTokenExpiresAt = Date.now() + data.expiresIn * 1000 - 60000;
    await secureStorage.setRefreshToken(data.refreshToken);

    return true;
  } catch (error) {
    console.error("Refresh token error:", error);
    return false;
  }
}

/**
 * Get a valid access token (refreshes if needed)
 */
export async function getAccessToken(): Promise<string | null> {
  // Check if we have a valid access token
  if (accessToken && accessTokenExpiresAt && Date.now() < accessTokenExpiresAt) {
    return accessToken;
  }

  // Try to refresh
  const refreshed = await refreshAccessToken();
  if (refreshed) {
    return accessToken;
  }

  return null;
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}

/**
 * Initialize auth state on app start
 */
export async function initAuth(): Promise<boolean> {
  const refreshToken = await secureStorage.getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  // Try to refresh on init
  return refreshAccessToken();
}

/**
 * Logout and clear all tokens
 */
export async function logout(): Promise<void> {
  const refreshToken = await secureStorage.getRefreshToken();

  // Call logout endpoint
  if (refreshToken) {
    try {
      await fetch(`${API_BASE}/api/mobile/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Ignore errors during logout
    }
  }

  // Clear local state
  accessToken = null;
  accessTokenExpiresAt = null;
  await secureStorage.clearAll();
}

/**
 * Get authorization header for API requests
 */
export async function getAuthHeader(): Promise<{ Authorization: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

