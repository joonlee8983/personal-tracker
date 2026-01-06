"use client";

import { Item } from "@prisma/client";
import { ItemList } from "@/components/item-list";
import { AlertCircle } from "lucide-react";

interface InboxViewProps {
  items: Item[];
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function InboxView({ items, onUpdate, onDelete }: InboxViewProps) {
  const needsReviewItems = items.filter((item) => item.needsReview);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-amber-700">
        <AlertCircle className="h-5 w-5" />
        <p className="text-sm">
          These items need your review. The AI wasn&apos;t confident enough or needs more information.
        </p>
      </div>

      <ItemList
        items={needsReviewItems}
        onUpdate={onUpdate}
        onDelete={onDelete}
        emptyMessage="No items need review. Great job!"
        emptyIcon="inbox"
      />
    </div>
  );
}

