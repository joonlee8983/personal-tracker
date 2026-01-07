import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";
import { fetchSettings, updateSettings, testPushNotification } from "@/src/lib/api";
import type { UserSettings } from "@todo/shared";

const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const DIGEST_TIMES = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
];

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const result = await fetchSettings();
      if (result.success && result.data) {
        setSettings(result.data.settings);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSetting = async (
    key: keyof UserSettings,
    value: unknown
  ) => {
    if (!settings) return;

    const oldSettings = { ...settings };
    setSettings({ ...settings, [key]: value });
    setIsSaving(true);

    try {
      const result = await updateSettings({ [key]: value });
      if (!result.success) {
        // Revert on failure
        setSettings(oldSettings);
        Alert.alert("Error", "Failed to save setting");
      }
    } catch {
      setSettings(oldSettings);
      Alert.alert("Error", "Network error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const result = await testPushNotification();
      if (result.success) {
        Alert.alert("Success", "Test notification sent!");
      } else {
        Alert.alert("Error", result.error || "Failed to send test notification");
      }
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setIsTesting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => logout(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Daily Digest Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Digest</Text>
        <Text style={styles.sectionSubtitle}>
          Receive a morning notification with your tasks for the day.
        </Text>

        <View style={styles.row}>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Enable Daily Digest</Text>
          </View>
          <Switch
            value={settings?.dailyDigestEnabled ?? true}
            onValueChange={(value) =>
              handleUpdateSetting("dailyDigestEnabled", value)
            }
            trackColor={{ false: "#e2e8f0", true: "#93c5fd" }}
            thumbColor={settings?.dailyDigestEnabled ? "#3b82f6" : "#f4f4f5"}
          />
        </View>

        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            // Show time picker
            Alert.alert(
              "Digest Time",
              "Select when to receive your daily digest",
              DIGEST_TIMES.map((time) => ({
                text: time,
                onPress: () => handleUpdateSetting("dailyDigestTime", time),
              }))
            );
          }}
        >
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Notification Time</Text>
            <Text style={styles.rowValue}>
              {settings?.dailyDigestTime || "08:00"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            // Show timezone picker
            Alert.alert(
              "Timezone",
              "Select your timezone",
              TIMEZONES.map((tz) => ({
                text: tz.replace("_", " "),
                onPress: () => handleUpdateSetting("timezone", tz),
              }))
            );
          }}
        >
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>Timezone</Text>
            <Text style={styles.rowValue}>
              {settings?.timezone?.replace("_", " ") || "America/Los Angeles"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, styles.buttonRow]}
          onPress={handleTestNotification}
          disabled={isTesting}
        >
          <View style={styles.rowContent}>
            <Ionicons name="notifications-outline" size={20} color="#3b82f6" />
            <Text style={[styles.rowLabel, styles.buttonLabel]}>
              {isTesting ? "Sending..." : "Test Notification"}
            </Text>
          </View>
          {isTesting && <ActivityIndicator size="small" color="#3b82f6" />}
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <View style={styles.rowContent}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[styles.rowLabel, styles.dangerLabel]}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>AI Todo v1.0.0</Text>
        {isSaving && (
          <Text style={styles.savingText}>Saving...</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  rowLabel: {
    fontSize: 16,
    color: "#1e293b",
  },
  rowValue: {
    fontSize: 16,
    color: "#64748b",
    marginLeft: "auto",
    marginRight: 8,
  },
  buttonRow: {
    backgroundColor: "#f8fafc",
  },
  buttonLabel: {
    color: "#3b82f6",
  },
  dangerLabel: {
    color: "#ef4444",
  },
  footer: {
    alignItems: "center",
    padding: 24,
  },
  footerText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  savingText: {
    fontSize: 12,
    color: "#3b82f6",
    marginTop: 4,
  },
});

