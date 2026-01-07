import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/hooks/useAuth";

export default function PairScreen() {
  const { login } = useAuth();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleCodeChange = (text: string, index: number) => {
    // Only accept alphanumeric
    const char = text.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (char.length <= 1) {
      const newCode = [...code];
      newCode[index] = char;
      setCode(newCode);
      setError(null);

      // Auto-advance to next input
      if (char && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when complete
      if (char && index === 5) {
        Keyboard.dismiss();
        const fullCode = newCode.join("");
        if (fullCode.length === 6) {
          handleSubmit(fullCode);
        }
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (fullCode?: string) => {
    const codeToSubmit = fullCode || code.join("");
    if (codeToSubmit.length !== 6) {
      setError("Please enter all 6 characters");
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await login(codeToSubmit);

    if (!result.success) {
      setError(result.error || "Invalid code");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }

    setIsLoading(false);
  };

  const handlePaste = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (cleaned.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < cleaned.length; i++) {
        newCode[i] = cleaned[i];
      }
      setCode(newCode);
      setError(null);

      if (cleaned.length === 6) {
        Keyboard.dismiss();
        handleSubmit(cleaned);
      } else {
        inputRefs.current[cleaned.length]?.focus();
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Logo/Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="link" size={64} color="#3b82f6" />
        </View>

        <Text style={styles.title}>Pair Your Device</Text>
        <Text style={styles.subtitle}>
          Enter the 6-character code from the web app to connect this device to
          your account.
        </Text>

        {/* Code Input */}
        <View style={styles.codeContainer}>
          {code.map((char, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.codeInput,
                char && styles.codeInputFilled,
                error && styles.codeInputError,
              ]}
              value={char}
              onChangeText={(text) => {
                // Handle paste
                if (text.length > 1) {
                  handlePaste(text);
                } else {
                  handleCodeChange(text, index);
                }
              }}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              maxLength={6} // Allow paste
              keyboardType="default"
              autoCapitalize="characters"
              autoCorrect={false}
              selectTextOnFocus
              editable={!isLoading}
            />
          ))}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.button,
            (isLoading || code.join("").length !== 6) && styles.buttonDisabled,
          ]}
          onPress={() => handleSubmit()}
          disabled={isLoading || code.join("").length !== 6}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect Device</Text>
          )}
        </TouchableOpacity>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to get a code:</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              Open the web app at your-todo-app.vercel.app
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Go to Settings → Mobile Pairing</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Click "Generate Device Code" and enter it above
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  codeInputFilled: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  codeInputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  instructions: {
    marginTop: 48,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 12,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
    overflow: "hidden",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
});

