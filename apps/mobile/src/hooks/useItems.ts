import { useState, useEffect, useCallback } from "react";
import type { Item } from "@todo/shared";
import { fetchItems, updateItem, deleteItem, ItemsFilter } from "../lib/api";

interface UseItemsOptions {
  filters?: ItemsFilter;
  enabled?: boolean;
}

interface UseItemsResult {
  items: Item[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markDone: (id: string) => Promise<void>;
  markActive: (id: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateItemData: (id: string, updates: Partial<Item>) => Promise<void>;
  confirmReview: (id: string) => Promise<void>;
}

export function useItems(options: UseItemsOptions = {}): UseItemsResult {
  const { filters, enabled = true } = options;
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchItems(filters);
      if (result.success && result.data) {
        setItems(result.data.items);
      } else {
        setError(result.error || "Failed to fetch items");
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, JSON.stringify(filters)]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const markDone = useCallback(async (id: string) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "done" as const } : item
      )
    );

    const result = await updateItem(id, { status: "done" });
    if (!result.success) {
      // Revert on failure
      refetch();
    }
  }, [refetch]);

  const markActive = useCallback(async (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "active" as const } : item
      )
    );

    const result = await updateItem(id, { status: "active" });
    if (!result.success) {
      refetch();
    }
  }, [refetch]);

  const removeItem = useCallback(async (id: string) => {
    // Optimistic update
    setItems((prev) => prev.filter((item) => item.id !== id));

    const result = await deleteItem(id);
    if (!result.success) {
      refetch();
    }
  }, [refetch]);

  const updateItemData = useCallback(async (id: string, updates: Partial<Item>) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    const result = await updateItem(id, updates);
    if (!result.success) {
      refetch();
    }
  }, [refetch]);

  const confirmReview = useCallback(async (id: string) => {
    // Optimistic update - remove needsReview flag
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, needsReview: false } : item
      )
    );

    const result = await updateItem(id, { needsReview: false });
    if (!result.success) {
      refetch();
    }
  }, [refetch]);

  return {
    items,
    isLoading,
    error,
    refetch,
    markDone,
    markActive,
    removeItem,
    updateItemData,
    confirmReview,
  };
}

// Convenience hooks for specific views
export function useInboxItems() {
  return useItems({
    filters: { needsReview: true, status: "active" },
  });
}

export function useTodayItems() {
  const today = new Date().toISOString().split("T")[0];
  return useItems({
    filters: { status: "active", dueFrom: "1970-01-01", dueTo: today },
  });
}

export function useBucketItems(type: string) {
  return useItems({
    filters: { type, status: "active" },
  });
}

