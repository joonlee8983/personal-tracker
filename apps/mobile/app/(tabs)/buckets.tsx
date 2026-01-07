import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useBucketItems } from "@/src/hooks/useItems";
import { ItemList } from "@/src/components/ItemList";
import type { Item } from "@todo/shared";

type BucketType = "todo" | "reminder" | "idea" | "note";

const BUCKETS = [
  {
    type: "todo" as BucketType,
    label: "Todos",
    icon: "checkbox-outline" as const,
    color: "#3b82f6",
    bgColor: "#eff6ff",
  },
  {
    type: "reminder" as BucketType,
    label: "Reminders",
    icon: "alarm-outline" as const,
    color: "#f59e0b",
    bgColor: "#fefce8",
  },
  {
    type: "idea" as BucketType,
    label: "Ideas",
    icon: "bulb-outline" as const,
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
  },
  {
    type: "note" as BucketType,
    label: "Notes",
    icon: "document-text-outline" as const,
    color: "#10b981",
    bgColor: "#ecfdf5",
  },
];

export default function BucketsScreen() {
  const [selectedBucket, setSelectedBucket] = useState<BucketType>("todo");
  const router = useRouter();
  const { items, isLoading, error, refetch, markDone, markActive, removeItem } =
    useBucketItems(selectedBucket);

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

  const currentBucket = BUCKETS.find((b) => b.type === selectedBucket)!;

  const BucketTabs = () => (
    <View style={styles.tabsContainer}>
      <View style={styles.tabsContent}>
        {BUCKETS.map((bucket) => {
          const isSelected = selectedBucket === bucket.type;
          return (
            <TouchableOpacity
              key={bucket.type}
              style={[
                styles.tab,
                isSelected && { backgroundColor: bucket.bgColor, borderColor: bucket.color },
              ]}
              onPress={() => setSelectedBucket(bucket.type)}
            >
              <Ionicons
                name={bucket.icon}
                size={18}
                color={isSelected ? bucket.color : "#94a3b8"}
              />
              <Text
                style={[
                  styles.tabText,
                  isSelected && { color: bucket.color },
                ]}
                numberOfLines={1}
              >
                {bucket.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <BucketTabs />
      <ItemList
        items={items}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        onToggleDone={handleToggleDone}
        onItemPress={handleItemPress}
        onDelete={removeItem}
        emptyTitle={`No ${currentBucket.label.toLowerCase()}`}
        emptyMessage={`Your ${currentBucket.label.toLowerCase()} will appear here. Create one using the + button.`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  tabsContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tabsContent: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
});

