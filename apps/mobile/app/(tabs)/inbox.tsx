import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useInboxItems } from "@/src/hooks/useItems";
import { ItemList } from "@/src/components/ItemList";
import type { Item } from "@todo/shared";

export default function InboxScreen() {
  const router = useRouter();
  const { items, isLoading, error, refetch, markDone, markActive, removeItem, confirmReview } =
    useInboxItems();

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

  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Review Items</Text>
      <Text style={styles.subtitle}>
        These items need your attention. The AI wasn&apos;t confident about the
        classification or is missing required information.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ItemList
        items={items}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        onToggleDone={handleToggleDone}
        onItemPress={handleItemPress}
        onDelete={removeItem}
        onConfirmReview={confirmReview}
        emptyTitle="Inbox is empty"
        emptyMessage="All items have been reviewed. New items that need attention will appear here."
        ListHeaderComponent={<Header />}
      />
    </View>
  );
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
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
});

