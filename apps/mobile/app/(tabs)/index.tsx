import React from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTodayItems } from "@/src/hooks/useItems";
import { ItemCard } from "@/src/components/ItemCard";
import { DigestCard } from "@/src/components/DigestCard";
import type { Item } from "@todo/shared";
import { format } from "date-fns";

export default function TodayScreen() {
  const router = useRouter();
  const { items, isLoading, error, refetch, markDone, markActive, removeItem } =
    useTodayItems();

  // Auto-refresh when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleToggleDone = (id: string, currentStatus: string) => {
    if (currentStatus === "active") {
      markDone(id);
    } else {
      markActive(id);
    }
  };

  const handleItemPress = (item: Item) => {
    router.push(`/item/${item.id}`);
  };

  // Separate items into categories
  const activeItems = items.filter((item) => item.status === "active");
  
  // Only show items completed today (based on updatedAt)
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const completedItems = items.filter(
    (item) =>
      item.status === "done" &&
      item.updatedAt &&
      format(new Date(item.updatedAt), "yyyy-MM-dd") === todayStr
  );
  
  const overdueItems = activeItems.filter(
    (item) =>
      item.dueAt &&
      new Date(item.dueAt) < new Date() &&
      format(new Date(item.dueAt), "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd")
  );
  const dueToday = activeItems.filter(
    (item) =>
      item.dueAt &&
      format(new Date(item.dueAt), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  );
  const priorityItems = activeItems.filter(
    (item) =>
      item.priority &&
      ["P0", "P1"].includes(item.priority) &&
      !overdueItems.includes(item) &&
      !dueToday.includes(item)
  );

  const todayActiveTasks = [...overdueItems, ...dueToday, ...priorityItems];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Good {getGreeting()}!</Text>
        <Text style={styles.date}>{format(new Date(), "EEEE, MMMM d")}</Text>

        <View style={styles.stats}>
          {overdueItems.length > 0 && (
            <View style={[styles.statBadge, styles.overdueBadge]}>
              <Text style={styles.statText}>
                {overdueItems.length} overdue
              </Text>
            </View>
          )}
          {dueToday.length > 0 && (
            <View style={[styles.statBadge, styles.todayBadge]}>
              <Text style={styles.statText}>
                {dueToday.length} due today
              </Text>
            </View>
          )}
          {priorityItems.length > 0 && (
            <View style={[styles.statBadge, styles.priorityBadge]}>
              <Text style={styles.statText}>
                {priorityItems.length} high priority
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Daily Digest - Always visible */}
      <DigestCard />

      {/* Active Tasks Section */}
      {todayActiveTasks.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Today's Tasks</Text>
          {todayActiveTasks.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggleDone={() => handleToggleDone(item.id, item.status)}
              onPress={() => handleItemPress(item)}
              onDelete={() => removeItem(item.id)}
            />
          ))}
        </>
      )}

      {/* Completed Section */}
      {completedItems.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Completed</Text>
          {completedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggleDone={() => handleToggleDone(item.id, item.status)}
              onPress={() => handleItemPress(item)}
              onDelete={() => removeItem(item.id)}
            />
          ))}
        </>
      )}

      {/* Empty state - only when no tasks at all */}
      {todayActiveTasks.length === 0 && completedItems.length === 0 && !isLoading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>All caught up! 🎉</Text>
          <Text style={styles.emptyMessage}>
            No tasks for today. Add something using the + button.
          </Text>
        </View>
      )}

      {/* Bottom padding */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
  },
  date: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 12,
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  overdueBadge: {
    backgroundColor: "#fef2f2",
  },
  todayBadge: {
    backgroundColor: "#fefce8",
  },
  priorityBadge: {
    backgroundColor: "#eff6ff",
  },
  statText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
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
  },
});

