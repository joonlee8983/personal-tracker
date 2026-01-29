import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useTodayItems } from "@/src/hooks/useItems";
import { ItemList } from "@/src/components/ItemList";
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

  const handleToggleDone = (id: string, newStatus: string) => {
    if (newStatus === "done") {
      markDone(id);
    } else {
      markActive(id);
    }
  };

  const handleItemPress = (item: Item) => {
    router.push(`/item/${item.id}`);
  };

  // Separate items into categories
  const overdueItems = items.filter(
    (item) =>
      item.dueAt &&
      new Date(item.dueAt) < new Date() &&
      item.status === "active"
  );
  const dueToday = items.filter(
    (item) =>
      item.dueAt &&
      format(new Date(item.dueAt), "yyyy-MM-dd") ===
        format(new Date(), "yyyy-MM-dd") &&
      item.status === "active"
  );
  const priorityItems = items.filter(
    (item) =>
      item.priority &&
      ["P0", "P1"].includes(item.priority) &&
      item.status === "active" &&
      !overdueItems.includes(item) &&
      !dueToday.includes(item)
  );

  const Header = () => (
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
  );

  return (
    <View style={styles.container}>
      <ItemList
        items={[...overdueItems, ...dueToday, ...priorityItems]}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        onToggleDone={handleToggleDone}
        onItemPress={handleItemPress}
        onDelete={removeItem}
        emptyTitle="All caught up! 🎉"
        emptyMessage="No urgent tasks for today. Add something using the + button."
        ListHeaderComponent={<Header />}
      />
    </View>
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
});

