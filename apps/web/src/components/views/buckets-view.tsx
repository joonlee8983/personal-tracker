"use client";

import { useState } from "react";
import { Item } from "@prisma/client";
import { ItemList } from "@/components/item-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Bell, Lightbulb, FileText } from "lucide-react";

interface BucketsViewProps {
  items: Item[];
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type BucketType = "todo" | "reminder" | "idea" | "note";
type StatusFilter = "all" | "active" | "done";

const bucketConfig = {
  todo: { icon: CheckSquare, label: "Todos", emptyIcon: "check" as const },
  reminder: { icon: Bell, label: "Reminders", emptyIcon: "clock" as const },
  idea: { icon: Lightbulb, label: "Ideas", emptyIcon: "lightbulb" as const },
  note: { icon: FileText, label: "Notes", emptyIcon: "file" as const },
};

export function BucketsView({ items, onUpdate, onDelete }: BucketsViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const filterByStatus = (list: Item[]) => {
    if (statusFilter === "all") return list;
    return list.filter((item) => item.status === statusFilter);
  };

  const getItemsByType = (type: BucketType) =>
    filterByStatus(items.filter((item) => item.type === type));

  const getCounts = (type: BucketType) => ({
    total: items.filter((i) => i.type === type).length,
    active: items.filter((i) => i.type === type && i.status === "active").length,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="todo" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          {(Object.keys(bucketConfig) as BucketType[]).map((type) => {
            const config = bucketConfig[type];
            const counts = getCounts(type);
            const Icon = config.icon;
            return (
              <TabsTrigger
                key={type}
                value={type}
                className="flex items-center gap-1.5"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{config.label}</span>
                <span className="text-xs text-muted-foreground">
                  ({counts.active})
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(bucketConfig) as BucketType[]).map((type) => {
          const config = bucketConfig[type];
          return (
            <TabsContent key={type} value={type} className="mt-4">
              <ItemList
                items={getItemsByType(type)}
                onUpdate={onUpdate}
                onDelete={onDelete}
                emptyMessage={`No ${config.label.toLowerCase()} yet`}
                emptyIcon={config.emptyIcon}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

