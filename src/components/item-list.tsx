"use client";

import { Item } from "@prisma/client";
import { ItemCard } from "./item-card";
import { Inbox, CalendarDays, Lightbulb, FileText, CheckSquare, Clock } from "lucide-react";

interface ItemListProps {
  items: Item[];
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  emptyMessage?: string;
  emptyIcon?: "inbox" | "calendar" | "lightbulb" | "file" | "check" | "clock";
}

const iconMap = {
  inbox: Inbox,
  calendar: CalendarDays,
  lightbulb: Lightbulb,
  file: FileText,
  check: CheckSquare,
  clock: Clock,
};

export function ItemList({
  items,
  onUpdate,
  onDelete,
  emptyMessage = "No items yet",
  emptyIcon = "inbox",
}: ItemListProps) {
  const Icon = iconMap[emptyIcon];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={item.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <ItemCard item={item} onUpdate={onUpdate} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}

