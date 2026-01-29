import React from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import type { Item } from "@todo/shared";
import { ItemCard } from "./ItemCard";

interface ItemListProps {
  items: Item[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onToggleDone: (id: string, currentStatus: string) => void;
  onItemPress: (item: Item) => void;
  onDelete?: (id: string) => void;
  onConfirmReview?: (id: string) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  ListHeaderComponent?: React.ReactElement;
}

export function ItemList({
  items,
  isLoading,
  error,
  onRefresh,
  onToggleDone,
  onItemPress,
  onDelete,
  onConfirmReview,
  emptyTitle = "No items",
  emptyMessage = "Create your first item using the capture button below.",
  ListHeaderComponent,
}: ItemListProps) {
  if (isLoading && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={onRefresh}>
          Tap to retry
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ItemCard
          item={item}
          onToggleDone={() =>
            onToggleDone(item.id, item.status === "done" ? "active" : "done")
          }
          onPress={() => onItemPress(item)}
          onDelete={onDelete ? () => onDelete(item.id) : undefined}
          onConfirmReview={onConfirmReview ? () => onConfirmReview(item.id) : undefined}
        />
      )}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor="#3b82f6"
        />
      }
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
  },
  retryText: {
    marginTop: 8,
    fontSize: 14,
    color: "#3b82f6",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingVertical: 12,
  },
});

