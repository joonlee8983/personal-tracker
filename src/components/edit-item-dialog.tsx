"use client";

import { useState } from "react";
import { Item, ItemType, Priority } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface EditItemDialogProps {
  item: Item;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Item>) => Promise<void>;
}

export function EditItemDialog({
  item,
  open,
  onOpenChange,
  onSave,
}: EditItemDialogProps) {
  const [title, setTitle] = useState(item.title);
  const [details, setDetails] = useState(item.details || "");
  const [type, setType] = useState<ItemType>(item.type);
  const [priority, setPriority] = useState<Priority | "none">(item.priority || "none");
  const [dueAt, setDueAt] = useState(
    item.dueAt ? format(new Date(item.dueAt), "yyyy-MM-dd'T'HH:mm") : ""
  );
  const [tags, setTags] = useState(item.tags.join(", "));
  const [needsReview, setNeedsReview] = useState(item.needsReview);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(item.id, {
        title,
        details: details || null,
        type: type as Item["type"],
        priority: priority === "none" ? null : (priority as Item["priority"]),
        dueAt: dueAt ? new Date(dueAt) : null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        needsReview,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="details">Details</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ItemType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority | "none")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="P0">P0 - Urgent</SelectItem>
                  <SelectItem value="P1">P1 - Important</SelectItem>
                  <SelectItem value="P2">P2 - Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dueAt">Due Date</Label>
            <Input
              id="dueAt"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="work, personal, urgent"
            />
          </div>

          {item.needsReview && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="needsReview"
                checked={!needsReview}
                onChange={(e) => setNeedsReview(!e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="needsReview" className="text-sm font-normal">
                Mark as reviewed (remove from inbox)
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

