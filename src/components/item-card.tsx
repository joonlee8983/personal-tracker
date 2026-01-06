"use client";

import { useState } from "react";
import { Item } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  MoreHorizontal,
  RotateCcw,
  Pencil,
  Trash2,
  AlertCircle,
  Mic,
  MessageSquare,
} from "lucide-react";
import { cn, getRelativeDateLabel, getPriorityColor, getTypeColor, capitalize } from "@/lib/utils";
import { EditItemDialog } from "./edit-item-dialog";

interface ItemCardProps {
  item: Item;
  onUpdate: (id: string, updates: Partial<Item>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ItemCard({ item, onUpdate, onDelete }: ItemCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleToggleStatus = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(item.id, {
        status: item.status === "done" ? "active" : "done",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      await onDelete(item.id);
    }
  };

  const dateLabel = getRelativeDateLabel(item.dueAt);
  const isOverdue = dateLabel === "Overdue";
  const isDone = item.status === "done";

  return (
    <>
      <div
        className={cn(
          "group relative rounded-lg border bg-card p-4 transition-all hover:shadow-md",
          isDone && "opacity-60",
          item.needsReview && "border-amber-300 bg-amber-50/50"
        )}
      >
        {/* Top row: checkbox, title, menu */}
        <div className="flex items-start gap-3">
          <button
            onClick={handleToggleStatus}
            disabled={isUpdating}
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              isDone
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-gray-300 hover:border-gray-400"
            )}
          >
            {isDone && <Check className="h-3 w-3" />}
          </button>

          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "text-sm font-medium leading-tight",
                isDone && "line-through text-muted-foreground"
              )}
            >
              {item.title}
            </h3>

            {item.details && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {item.details}
              </p>
            )}

            {/* Badges row */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0", getTypeColor(item.type))}
              >
                {capitalize(item.type)}
              </Badge>

              {item.priority && (
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0", getPriorityColor(item.priority))}
                >
                  {item.priority}
                </Badge>
              )}

              {dateLabel && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    isOverdue
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  )}
                >
                  {dateLabel}
                </Badge>
              )}

              {item.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  {tag}
                </Badge>
              ))}

              {item.needsReview && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 border-amber-300 bg-amber-50 text-amber-700"
                >
                  <AlertCircle className="mr-0.5 h-2.5 w-2.5" />
                  Review
                </Badge>
              )}

              {item.sourceType === "voice" && (
                <Mic className="h-3 w-3 text-muted-foreground" />
              )}
              {item.sourceType === "text" && (
                <MessageSquare className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleStatus}>
                {isDone ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reopen
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Mark Done
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditItemDialog
        item={item}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSave={onUpdate}
      />
    </>
  );
}

