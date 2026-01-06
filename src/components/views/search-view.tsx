"use client";

import { useState, useMemo } from "react";
import { Item } from "@prisma/client";
import { ItemList } from "@/components/item-list";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchViewProps {
  items: Item[];
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SearchView({ items, onUpdate, onDelete }: SearchViewProps) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.details?.toLowerCase().includes(lowerQuery) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)) ||
        item.type.toLowerCase().includes(lowerQuery)
    );
  }, [items, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items by title, details, tags..."
          className="pl-10"
        />
      </div>

      {query.trim() ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""} for &quot;{query}&quot;
          </p>
          <ItemList
            items={filteredItems}
            onUpdate={onUpdate}
            onDelete={onDelete}
            emptyMessage="No items match your search"
            emptyIcon="inbox"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Start typing to search your items
          </p>
        </div>
      )}
    </div>
  );
}

