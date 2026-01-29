import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type NotificationType = "success" | "error" | "info";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
}

interface NotificationContextType {
  showNotification: (type: NotificationType, title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const insets = useSafeAreaInsets();

  const showNotification = useCallback(
    (type: NotificationType, title: string, message?: string) => {
      const id = Date.now().toString();
      setNotifications((prev) => [...prev, { id, type, title, message }]);

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 4000);
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {/* Notification Banner Container */}
      <View style={[styles.container, { top: insets.top + 8 }]}>
        {notifications.map((notification) => (
          <NotificationBanner
            key={notification.id}
            notification={notification}
            onDismiss={() => dismissNotification(notification.id)}
          />
        ))}
      </View>
    </NotificationContext.Provider>
  );
}

interface NotificationBannerProps {
  notification: Notification;
  onDismiss: () => void;
}

function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (notification.type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      case "info":
        return "information-circle";
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case "success":
        return { bg: "#ecfdf5", border: "#10b981", icon: "#10b981", text: "#065f46" };
      case "error":
        return { bg: "#fef2f2", border: "#ef4444", icon: "#ef4444", text: "#991b1b" };
      case "info":
        return { bg: "#eff6ff", border: "#3b82f6", icon: "#3b82f6", text: "#1e40af" };
    }
  };

  const colors = getColors();

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: colors.bg,
          borderLeftColor: colors.border,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Ionicons name={getIcon()} size={24} color={colors.icon} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {notification.title}
        </Text>
        {notification.message && (
          <Text style={[styles.message, { color: colors.text }]} numberOfLines={2}>
            {notification.message}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={20} color={colors.text} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
    gap: 8,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingLeft: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  message: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.8,
  },
});
