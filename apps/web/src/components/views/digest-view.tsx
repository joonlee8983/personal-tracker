"use client";

import { useState, useEffect, useCallback } from "react";
import { DigestLog } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DigestSkeleton } from "@/components/loading-skeleton";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Calendar, Mail, FileText } from "lucide-react";
import { format } from "date-fns";

interface DigestViewProps {
  onRunDigest: () => Promise<void>;
}

export function DigestView({ onRunDigest }: DigestViewProps) {
  const [digests, setDigests] = useState<DigestLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDigest, setSelectedDigest] = useState<DigestLog | null>(null);

  const fetchDigests = useCallback(async () => {
    try {
      const res = await fetch("/api/digest?limit=7");
      if (res.ok) {
        const data = await res.json();
        setDigests(data.digestLogs);
        if (data.digestLogs.length > 0) {
          setSelectedDigest((prev) => prev || data.digestLogs[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch digests:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDigests();
  }, [fetchDigests]);

  const handleRunDigest = async () => {
    setIsRunning(true);
    try {
      await onRunDigest();
      await fetchDigests();
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return <DigestSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Daily Digests</h2>
          <p className="text-sm text-muted-foreground">
            Morning summaries of your tasks and priorities
          </p>
        </div>
        <Button onClick={handleRunDigest} disabled={isRunning} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Generating..." : "Generate Now"}
        </Button>
      </div>

      {digests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">
            No digests yet. Generate your first one!
          </p>
          <Button onClick={handleRunDigest} disabled={isRunning}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
            Generate Digest
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
          {/* Digest list */}
          <div className="space-y-2">
            {digests.map((digest) => (
              <button
                key={digest.id}
                onClick={() => setSelectedDigest(digest)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedDigest?.id === digest.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(digest.date), "MMM d")}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  {digest.sentVia === "email" && (
                    <>
                      <Mail className="h-3 w-3" />
                      Sent
                    </>
                  )}
                  {digest.sentVia === "in_app" && (
                    <>
                      <FileText className="h-3 w-3" />
                      In-app
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Selected digest content */}
          {selectedDigest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {format(new Date(selectedDigest.date), "EEEE, MMMM d, yyyy")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdownToHtml(selectedDigest.content),
                    }}
                  />
                </div>
                {selectedDigest.sentAt && (
                  <>
                    <Separator className="my-4" />
                    <p className="text-xs text-muted-foreground">
                      Sent at {format(new Date(selectedDigest.sentAt), "h:mm a")}
                      {selectedDigest.sentVia === "email" && " via email"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Simple markdown to HTML converter for digest content
function formatMarkdownToHtml(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/^\* (.*$)/gim, "<li>$1</li>")
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/^\d+\. (.*$)/gim, "<li>$1</li>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br>")
    .replace(/<br><li>/g, "<li>")
    .replace(/<\/li><br>/g, "</li>");
}

