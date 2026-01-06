"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

interface TextInputProps {
  onSubmit: (text: string) => Promise<void>;
  disabled?: boolean;
}

export function TextInput({ onSubmit, disabled }: TextInputProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a task, reminder, idea, or note... (Cmd/Ctrl + Enter to submit)"
        disabled={disabled || isSubmitting}
        rows={3}
        className="pr-12 resize-none"
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={disabled || isSubmitting || !text.trim()}
        className="absolute bottom-2 right-2 h-8 w-8"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

