import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export function CaptureButton() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useState(new Animated.Value(0))[0];

  const toggleMenu = () => {
    const toValue = isExpanded ? 0 : 1;

    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    setIsExpanded(!isExpanded);
  };

  const handleTextCapture = () => {
    toggleMenu();
    router.push("/capture/text");
  };

  const handleVoiceCapture = () => {
    toggleMenu();
    router.push("/capture/voice");
  };

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const textButtonTranslate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70],
  });

  const voiceButtonTranslate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  return (
    <View style={styles.container}>
      {/* Text Capture Button */}
      <Animated.View
        style={[
          styles.secondaryButton,
          {
            opacity,
            transform: [{ translateY: textButtonTranslate }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, styles.textButton]}
          onPress={handleTextCapture}
        >
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Voice Capture Button */}
      <Animated.View
        style={[
          styles.secondaryButton,
          {
            opacity,
            transform: [{ translateY: voiceButtonTranslate }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, styles.voiceButton]}
          onPress={handleVoiceCapture}
        >
          <Ionicons name="mic-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Main Button */}
      <TouchableOpacity
        style={[styles.button, styles.mainButton]}
        onPress={toggleMenu}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="add" size={32} color="#fff" />
        </Animated.View>
      </TouchableOpacity>

      {/* Overlay */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={toggleMenu}
          activeOpacity={1}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    right: 20,
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    top: -1000,
    left: -width,
    width: width * 2,
    height: 2000,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: -1,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  mainButton: {
    backgroundColor: "#3b82f6",
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  secondaryButton: {
    position: "absolute",
    bottom: 0,
  },
  textButton: {
    backgroundColor: "#10b981",
  },
  voiceButton: {
    backgroundColor: "#8b5cf6",
  },
});

