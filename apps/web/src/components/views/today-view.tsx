"use client";

import { Item } from "@prisma/client";
import { ItemList } from "@/components/item-list";
import { isToday, isOverdue } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface TodayViewProps {
  items: Item[];
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TodayView({ items, onUpdate, onDelete }: TodayViewProps) {
  const activeItems = items.filter((item) => item.status === "active");

  // P0 and P1 items
  const topPriorities = activeItems.filter(
    (item) => item.priority === "P0" || item.priority === "P1"
  );

  // Due today
  const dueToday = activeItems.filter(
    (item) => item.dueAt && isToday(item.dueAt)
  );

  // Overdue
  const overdueItems = activeItems.filter(
    (item) => item.dueAt && isOverdue(item.dueAt)
  );

  // Deduplicate (some items might appear in multiple sections)
  const shownIds = new Set<string>();
  const getUnique = (list: Item[]) =>
    list.filter((item) => {
      if (shownIds.has(item.id)) return false;
      shownIds.add(item.id);
      return true;
    });

  const uniqueOverdue = getUnique(overdueItems);
  const uniquePriorities = getUnique(topPriorities);
  const uniqueDueToday = getUnique(dueToday);

  const hasContent =
    uniqueOverdue.length > 0 ||
    uniquePriorities.length > 0 ||
    uniqueDueToday.length > 0;

  if (!hasContent) {
    return (
      <ItemList
        items={[]}
        onUpdate={onUpdate}
        onDelete={onDelete}
        emptyMessage="Nothing urgent today. Enjoy your day!"
        emptyIcon="calendar"
      />
    );
  }

  return (
    <div className="space-y-6">
      {uniqueOverdue.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            ⚠️ Overdue ({uniqueOverdue.length})
          </h3>
          <ItemList
            items={uniqueOverdue}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </section>
      )}

      {uniqueOverdue.length > 0 && (uniquePriorities.length > 0 || uniqueDueToday.length > 0) && (
        <Separator />
      )}

      {uniquePriorities.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            🎯 Top Priorities ({uniquePriorities.length})
          </h3>
          <ItemList
            items={uniquePriorities}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </section>
      )}

      {uniquePriorities.length > 0 && uniqueDueToday.length > 0 && <Separator />}

      {uniqueDueToday.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            📅 Due Today ({uniqueDueToday.length})
          </h3>
          <ItemList
            items={uniqueDueToday}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </section>
      )}
    </div>
  );
}

