import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { Item } from "@todo/shared";
import { format, isToday, isPast, parseISO } from "date-fns";

interface ItemCardProps {
  item: Item;
  onToggleDone: () => void;
  onPress: () => void;
  onDelete?: () => void;
  onConfirmReview?: () => void;
}

const TYPE_COLORS = {
  todo: "#3b82f6",
  reminder: "#f59e0b",
  idea: "#8b5cf6",
  note: "#10b981",
};

const TYPE_ICONS = {
  todo: "checkbox-outline" as const,
  reminder: "alarm-outline" as const,
  idea: "bulb-outline" as const,
  note: "document-text-outline" as const,
};

const PRIORITY_COLORS = {
  P0: "#ef4444",
  P1: "#f97316",
  P2: "#fbbf24",
};

export function ItemCard({ item, onToggleDone, onPress, onDelete, onConfirmReview }: ItemCardProps) {
  // Local state for immediate visual feedback
  const [isToggling, setIsToggling] = useState(false);
  const isDone = isToggling ? !item.status === "done" : item.status === "done";
  const showAsDone = isToggling ? item.status !== "done" : item.status === "done";
  
  const typeColor = TYPE_COLORS[item.type];
  const typeIcon = TYPE_ICONS[item.type];

  const dueDate = item.dueAt ? parseISO(item.dueAt) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !showAsDone;
  const isDueToday = dueDate && isToday(dueDate);

  const handleLongPress = () => {
    if (onDelete) {
      Alert.alert(
        "Delete Item",
        "Are you sure you want to delete this item?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: onDelete },
        ]
      );
    }
  };

  const handleToggle = async () => {
    // Immediate haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Show visual change immediately
    setIsToggling(true);
    
    // Call parent handler
    onToggleDone();
    
    // Reset local state after a short delay (parent state should have updated)
    setTimeout(() => setIsToggling(false), 100);
  };

  const handleConfirmReview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirmReview?.();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        showAsDone && styles.cardDone,
        item.needsReview && styles.cardReview,
      ]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={[
          styles.checkbox,
          showAsDone && styles.checkboxDone,
        ]}
        onPress={handleToggle}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {showAsDone && (
          <Ionicons name="checkmark" size={16} color="#fff" />
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + "20" }]}>
            <Ionicons name={typeIcon} size={12} color={typeColor} />
            <Text style={[styles.typeText, { color: typeColor }]}>
              {item.type}
            </Text>
          </View>

          {item.priority && (
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: PRIORITY_COLORS[item.priority] + "20" },
              ]}
            >
              <Text
                style={[
                  styles.priorityText,
                  { color: PRIORITY_COLORS[item.priority] },
                ]}
              >
                {item.priority}
              </Text>
            </View>
          )}

          {item.needsReview && (
            <View style={styles.reviewBadge}>
              <Ionicons name="eye-outline" size={12} color="#f59e0b" />
            </View>
          )}
        </View>

        <Text
          style={[styles.title, showAsDone && styles.titleDone]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {item.details && (
          <Text style={styles.details} numberOfLines={1}>
            {item.details}
          </Text>
        )}

        <View style={styles.footer}>
          {dueDate && (
            <View style={styles.dueContainer}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={isOverdue ? "#ef4444" : isDueToday ? "#f59e0b" : "#64748b"}
              />
              <Text
                style={[
                  styles.dueText,
                  isOverdue && styles.dueTextOverdue,
                  isDueToday && styles.dueTextToday,
                ]}
              >
                {isOverdue
                  ? "Overdue"
                  : isDueToday
                  ? "Today"
                  : format(dueDate, "MMM d")}
              </Text>
            </View>
          )}

          {item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 2).map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
              {item.tags.length > 2 && (
                <Text style={styles.moreText}>+{item.tags.length - 2}</Text>
              )}
            </View>
          )}
        </View>

        {/* Quick confirm button for items needing review */}
        {item.needsReview && onConfirmReview && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmReview}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardDone: {
    opacity: 0.6,
  },
  cardReview: {
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxDone: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  reviewBadge: {
    backgroundColor: "#fef3c7",
    padding: 4,
    borderRadius: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  titleDone: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },
  details: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dueText: {
    fontSize: 12,
    color: "#64748b",
  },
  dueTextOverdue: {
    color: "#ef4444",
    fontWeight: "600",
  },
  dueTextToday: {
    color: "#f59e0b",
    fontWeight: "600",
  },
  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tag: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: "#64748b",
  },
  moreText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10b981",
  },
});

