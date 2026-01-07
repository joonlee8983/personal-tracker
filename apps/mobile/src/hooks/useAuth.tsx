import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { initAuth, logout as authLogout, checkAuth, exchangeDeviceCode } from "../lib/auth";
import { registerForPushNotifications, setupNotificationListeners } from "../lib/notifications";
import { processOfflineQueue } from "../lib/api";
import { useRouter } from "expo-router";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth on mount
  useEffect(() => {
    const init = async () => {
      try {
        const authenticated = await initAuth();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          // Register for push notifications
          await registerForPushNotifications();

          // Process any offline queue
          await processOfflineQueue();
        }
      } catch (error) {
        console.error("Auth init error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Set up notification listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const cleanup = setupNotificationListeners(
      undefined,
      (response) => {
        // Handle notification tap
        const data = response.notification.request.content.data;
        if (data?.screen === "today") {
          router.push("/(tabs)");
        }
      }
    );

    return cleanup;
  }, [isAuthenticated, router]);

  const login = useCallback(async (code: string) => {
    const result = await exchangeDeviceCode(code);
    if (result.success) {
      setIsAuthenticated(true);

      // Register for push notifications after login
      await registerForPushNotifications();
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setIsAuthenticated(false);
    router.replace("/auth/pair");
  }, [router]);

  const refreshAuth = useCallback(async () => {
    const authenticated = await checkAuth();
    setIsAuthenticated(authenticated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

