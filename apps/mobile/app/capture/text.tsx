import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ingestText } from "@/src/lib/api";
import { useNotification } from "@/src/contexts/NotificationContext";

export default function TextCaptureScreen() {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [text, setText] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert("Error", "Please enter some text");
      return;
    }

    Keyboard.dismiss();
    const inputText = text.trim();
    
    // Close modal immediately and process in background
    router.back();

    try {
      const result = await ingestText(inputText);

      if (result.success && result.data) {
        const { item, needsReview } = result.data;

        // Truncate title for notification
        const shortTitle = item.title.length > 40 
          ? item.title.slice(0, 40) + "..." 
          : item.title;

        showNotification(
          "success",
          needsReview ? "Added to Inbox" : "Task Created",
          shortTitle
        );
      } else {
        showNotification(
          "error",
          "Failed to save",
          result.error || "Item could not be created"
        );
      }
    } catch (error) {
      console.error("Ingest error:", error);
      showNotification(
        "error",
        "Network Error",
        "Please check your connection and try again"
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="What's on your mind? Type a task, reminder, idea, or note..."
            placeholderTextColor="#94a3b8"
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={5000}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.hint}>
          <Ionicons name="bulb-outline" size={16} color="#f59e0b" />
          <Text style={styles.hintText}>
            AI will automatically classify your input as a todo, reminder,
            idea, or note.
          </Text>
        </View>
      </ScrollView>

      {/* Fixed bottom bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.charCount}>{text.length}/5000</Text>
        <TouchableOpacity
          style={[
            styles.submitButton,
            !text.trim() && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
          <Text style={styles.submitButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  inputContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: "#1e293b",
    minHeight: 160,
  },
  hint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    backgroundColor: "#fffbeb",
    borderRadius: 8,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  charCount: {
    fontSize: 13,
    color: "#94a3b8",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  submitButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
