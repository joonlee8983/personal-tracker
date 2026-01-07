import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { Item, ItemType, Priority } from "@todo/shared";
import { fetchItem, updateItem, deleteItem } from "@/src/lib/api";
import { format, parseISO } from "date-fns";

const TYPES: ItemType[] = ["todo", "reminder", "idea", "note"];
const PRIORITIES: (Priority | null)[] = ["P0", "P1", "P2", null];

const TYPE_COLORS = {
  todo: "#3b82f6",
  reminder: "#f59e0b",
  idea: "#8b5cf6",
  note: "#10b981",
};

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [type, setType] = useState<ItemType>("todo");
  const [priority, setPriority] = useState<Priority | null>(null);

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const result = await fetchItem(id);
      if (result.success && result.data) {
        const loadedItem = result.data.item;
        setItem(loadedItem);
        setTitle(loadedItem.title);
        setDetails(loadedItem.details || "");
        setType(loadedItem.type);
        setPriority(loadedItem.priority);
      } else {
        Alert.alert("Error", "Failed to load item");
        router.back();
      }
    } catch (error) {
      console.error("Load item error:", error);
      Alert.alert("Error", "Network error");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!item || !title.trim()) return;

    setIsSaving(true);
    try {
      const result = await updateItem(item.id, {
        title: title.trim(),
        details: details.trim() || null,
        type,
        priority,
        needsReview: false, // Clear review flag on edit
      });

      if (result.success && result.data) {
        setItem(result.data.item);
        setIsEditing(false);
      } else {
        Alert.alert("Error", "Failed to save changes");
      }
    } catch (error) {
      Alert.alert("Error", "Network error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!item) return;

    const newStatus = item.status === "done" ? "active" : "done";
    setItem({ ...item, status: newStatus });

    const result = await updateItem(item.id, { status: newStatus });
    if (!result.success) {
      setItem(item); // Revert
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Item",
      "Are you sure you want to delete this item? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteItem(item!.id);
            if (result.success) {
              router.back();
            } else {
              Alert.alert("Error", "Failed to delete item");
            }
          },
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

  if (!item) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete}>
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Status toggle */}
          <TouchableOpacity
            style={styles.statusButton}
            onPress={handleToggleStatus}
          >
            <View
              style={[
                styles.checkbox,
                item.status === "done" && styles.checkboxDone,
              ]}
            >
              {item.status === "done" && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <Text
              style={[
                styles.statusText,
                item.status === "done" && styles.statusTextDone,
              ]}
            >
              {item.status === "done" ? "Completed" : "Mark as done"}
            </Text>
          </TouchableOpacity>

          {isEditing ? (
            /* Edit Form */
            <View style={styles.editForm}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Item title"
                autoFocus
              />

              <Text style={styles.label}>Details</Text>
              <TextInput
                style={styles.detailsInput}
                value={details}
                onChangeText={setDetails}
                placeholder="Add details..."
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.label}>Type</Text>
              <View style={styles.optionsRow}>
                {TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.option,
                      type === t && {
                        backgroundColor: TYPE_COLORS[t] + "20",
                        borderColor: TYPE_COLORS[t],
                      },
                    ]}
                    onPress={() => setType(t)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        type === t && { color: TYPE_COLORS[t] },
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Priority</Text>
              <View style={styles.optionsRow}>
                {PRIORITIES.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.option,
                      priority === p && styles.optionSelected,
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        priority === p && styles.optionTextSelected,
                      ]}
                    >
                      {p || "None"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    setTitle(item.title);
                    setDetails(item.details || "");
                    setType(item.type);
                    setPriority(item.priority);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!title.trim() || isSaving) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!title.trim() || isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* View Mode */
            <View>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <View style={styles.header}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: TYPE_COLORS[item.type] + "20" },
                    ]}
                  >
                    <Text
                      style={[styles.typeText, { color: TYPE_COLORS[item.type] }]}
                    >
                      {item.type}
                    </Text>
                  </View>
                  {item.priority && (
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityText}>{item.priority}</Text>
                    </View>
                  )}
                  {item.needsReview && (
                    <View style={styles.reviewBadge}>
                      <Ionicons name="eye-outline" size={14} color="#f59e0b" />
                      <Text style={styles.reviewText}>Needs Review</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.title}>{item.title}</Text>

                {item.details && (
                  <Text style={styles.details}>{item.details}</Text>
                )}

                <View style={styles.editHint}>
                  <Ionicons name="create-outline" size={16} color="#94a3b8" />
                  <Text style={styles.editHintText}>Tap to edit</Text>
                </View>
              </TouchableOpacity>

              {/* Metadata */}
              <View style={styles.metadata}>
                {item.dueAt && (
                  <View style={styles.metaRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#64748b"
                    />
                    <Text style={styles.metaText}>
                      Due: {format(parseISO(item.dueAt), "PPP")}
                    </Text>
                  </View>
                )}

                {item.tags.length > 0 && (
                  <View style={styles.metaRow}>
                    <Ionicons name="pricetag-outline" size={16} color="#64748b" />
                    <Text style={styles.metaText}>
                      Tags: {item.tags.join(", ")}
                    </Text>
                  </View>
                )}

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={16} color="#64748b" />
                  <Text style={styles.metaText}>
                    Created: {format(parseISO(item.createdAt), "PPP")}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name={item.sourceType === "voice" ? "mic-outline" : "create-outline"}
                    size={16}
                    color="#64748b"
                  />
                  <Text style={styles.metaText}>
                    Source: {item.sourceType}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </>
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
  content: {
    padding: 16,
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  statusText: {
    fontSize: 16,
    color: "#64748b",
  },
  statusTextDone: {
    color: "#10b981",
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  priorityBadge: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ef4444",
  },
  reviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fefce8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reviewText: {
    fontSize: 12,
    color: "#92400e",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  details: {
    fontSize: 16,
    color: "#475569",
    lineHeight: 24,
    marginBottom: 12,
  },
  editHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  editHintText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  metadata: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: "#64748b",
  },
  editForm: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
    marginTop: 16,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
  },
  detailsInput: {
    fontSize: 16,
    color: "#475569",
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#3b82f6",
  },
  optionText: {
    fontSize: 14,
    color: "#64748b",
    textTransform: "capitalize",
  },
  optionTextSelected: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

