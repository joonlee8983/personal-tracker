import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { ingestVoice } from "@/src/lib/api";
import { useNotification } from "@/src/contexts/NotificationContext";

type RecordingState = "idle" | "recording" | "recorded" | "processing";

export default function VoiceCaptureScreen() {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Request permission and set audio mode on mount
  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionGranted(status.granted);

      if (status.granted) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      }
    })();

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  // Pulse animation while recording
  useEffect(() => {
    if (state === "recording") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [state, pulseAnim]);

  const startRecording = async () => {
    if (!permissionGranted) {
      Alert.alert(
        "Permission Required",
        "Microphone access is required to record voice memos."
      );
      return;
    }

    try {
      // Prepare and start recording
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      
      setState("recording");
      setDuration(0);

      // Update duration
      durationInterval.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    try {
      await audioRecorder.stop();
      setState("recorded");
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to stop recording");
    }
  };

  const discardRecording = () => {
    setDuration(0);
    setState("idle");
  };

  const submitRecording = async () => {
    const recordingUri = audioRecorder.uri;
    if (!recordingUri) {
      Alert.alert("Error", "No recording found");
      return;
    }

    // Close modal immediately and process in background
    router.back();

    // Process in background
    const filename = `recording_${Date.now()}.m4a`;
    
    try {
      const result = await ingestVoice(recordingUri, filename);

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
          result.error || "Voice memo could not be processed"
        );
      }
    } catch (error) {
      console.error("Submit error:", error);
      showNotification(
        "error",
        "Network Error",
        "Please check your connection and try again"
      );
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!permissionGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="mic-off-outline" size={64} color="#94a3b8" />
          <Text style={styles.statusText}>
            Microphone permission is required to record voice memos.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={async () => {
              const status = await AudioModule.requestRecordingPermissionsAsync();
              setPermissionGranted(status.granted);
              if (status.granted) {
                await setAudioModeAsync({
                  playsInSilentMode: true,
                  allowsRecording: true,
                });
              }
            }}
          >
            <Text style={styles.primaryButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Duration display */}
        <Text style={styles.duration}>{formatDuration(duration)}</Text>

        {/* Recording indicator */}
        <Animated.View
          style={[
            styles.recordingIndicator,
            (state === "recording" || recorderState.isRecording) && styles.recordingIndicatorActive,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Ionicons
            name={(state === "recording" || recorderState.isRecording) ? "mic" : "mic-outline"}
            size={64}
            color={(state === "recording" || recorderState.isRecording) ? "#ef4444" : "#94a3b8"}
          />
        </Animated.View>

        {/* Status text */}
        <Text style={styles.statusText}>
          {state === "idle" && "Tap the button to start recording"}
          {state === "recording" && "Recording... Tap to stop"}
          {state === "recorded" && "Recording complete. Review or submit."}
          {state === "processing" && "Processing your voice memo..."}
        </Text>

        {/* Processing indicator */}
        {state === "processing" && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.processingText}>
              Transcribing and classifying...
            </Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {state === "idle" && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={startRecording}
          >
            <View style={styles.recordButtonInner} />
          </TouchableOpacity>
        )}

        {state === "recording" && (
          <TouchableOpacity
            style={[styles.recordButton, styles.recordButtonActive]}
            onPress={stopRecording}
          >
            <View style={styles.stopButtonInner} />
          </TouchableOpacity>
        )}

        {state === "recorded" && (
          <View style={styles.recordedControls}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={discardRecording}
            >
              <Ionicons name="trash-outline" size={24} color="#ef4444" />
              <Text style={[styles.secondaryButtonText, { color: "#ef4444" }]}>
                Discard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={submitRecording}
            >
              <Ionicons name="send" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  duration: {
    fontSize: 48,
    fontWeight: "200",
    color: "#1e293b",
    fontVariant: ["tabular-nums"],
    marginBottom: 32,
  },
  recordingIndicator: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  recordingIndicatorActive: {
    backgroundColor: "#fef2f2",
  },
  statusText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  processingContainer: {
    marginTop: 24,
    alignItems: "center",
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    color: "#3b82f6",
  },
  controls: {
    padding: 24,
    paddingBottom: 48,
    alignItems: "center",
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f8fafc",
    borderWidth: 4,
    borderColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  recordButtonActive: {
    backgroundColor: "#fef2f2",
  },
  recordButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ef4444",
  },
  stopButtonInner: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  recordedControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  secondaryButton: {
    alignItems: "center",
    gap: 4,
    padding: 12,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
