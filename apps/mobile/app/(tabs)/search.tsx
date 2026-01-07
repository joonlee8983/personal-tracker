import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useItems } from "@/src/hooks/useItems";
import { ItemList } from "@/src/components/ItemList";
import type { Item } from "@todo/shared";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const router = useRouter();

  const { items, isLoading, error, refetch, markDone, markActive, removeItem } =
    useItems({
      filters: debouncedQuery ? { search: debouncedQuery } : undefined,
      enabled: debouncedQuery.length > 0,
    });

  // Simple debounce
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    // Debounce the search
    const timer = setTimeout(() => {
      setDebouncedQuery(text);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleDone = (id: string, newStatus: string) => {
    if (newStatus === "done") {
      markDone(id);
    } else {
      markActive(id);
    }
  };

  const handleItemPress = (item: Item) => {
    Keyboard.dismiss();
    router.push(`/item/${item.id}`);
  };

  const clearSearch = () => {
    setQuery("");
    setDebouncedQuery("");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons
              name="search-outline"
              size={20}
              color="#94a3b8"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={handleQueryChange}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Cancel button when searching */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              Keyboard.dismiss();
              clearSearch();
            }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {debouncedQuery.length === 0 ? (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color="#d1d5db" />
              <Text style={styles.emptyTitle}>Search your items</Text>
              <Text style={styles.emptySubtitle}>
                Find tasks, reminders, ideas, and notes by title, details, or tags.
              </Text>
            </View>
          </TouchableWithoutFeedback>
        ) : (
          <ItemList
            items={items}
            isLoading={isLoading}
            error={error}
            onRefresh={refetch}
            onToggleDone={handleToggleDone}
            onItemPress={handleItemPress}
            onDelete={removeItem}
            emptyTitle="No results found"
            emptyMessage={`No items match "${debouncedQuery}". Try a different search term.`}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: "#1e293b",
  },
  clearButton: {
    padding: 4,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cancelText: {
    fontSize: 16,
    color: "#3b82f6",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
});
