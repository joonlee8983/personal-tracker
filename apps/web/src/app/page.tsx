"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { Item } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TextInput } from "@/components/text-input";
import { VoiceRecorder } from "@/components/voice-recorder";
import { InboxView } from "@/components/views/inbox-view";
import { TodayView } from "@/components/views/today-view";
import { BucketsView } from "@/components/views/buckets-view";
import { SearchView } from "@/components/views/search-view";
import { DigestView } from "@/components/views/digest-view";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Inbox,
  CalendarDays,
  FolderKanban,
  Search,
  FileText,
  LogOut,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("today");

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    }
  }, [authLoading, user, router]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/items");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
      toast({
        title: "Error",
        description: "Failed to load items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user, fetchItems]);

  // Handle text submission
  const handleTextSubmit = async (text: string) => {
    try {
      const res = await fetch("/api/ingest/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Failed to process text");

      const data = await res.json();

      toast({
        title: data.needsReview ? "Added to Inbox" : "Item Created",
        description: `"${data.item.title}" classified as ${data.item.type}`,
      });

      await fetchItems();

      if (data.needsReview) {
        setActiveTab("inbox");
      }
    } catch (error) {
      console.error("Failed to submit text:", error);
      toast({
        title: "Error",
        description: "Failed to process your input",
        variant: "destructive",
      });
    }
  };

  // Handle voice recording
  const handleVoiceRecording = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const res = await fetch("/api/ingest/voice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to process voice memo");

      const data = await res.json();

      toast({
        title: data.needsReview ? "Added to Inbox" : "Item Created",
        description: `"${data.item.title}" classified as ${data.item.type}`,
      });

      await fetchItems();

      if (data.needsReview) {
        setActiveTab("inbox");
      }
    } catch (error) {
      console.error("Failed to process voice memo:", error);
      toast({
        title: "Error",
        description: "Failed to process voice memo",
        variant: "destructive",
      });
    }
  };

  // Handle item update
  const handleUpdateItem = async (id: string, updates: Partial<Item>) => {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update item");

      await fetchItems();

      toast({
        title: "Item Updated",
        description: "Your changes have been saved",
      });
    } catch (error) {
      console.error("Failed to update item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  // Handle item delete
  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete item");

      await fetchItems();

      toast({
        title: "Item Deleted",
        description: "The item has been removed",
      });
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  // Handle digest generation
  const handleRunDigest = async () => {
    try {
      const res = await fetch("/api/digest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: false }),
      });

      if (!res.ok) throw new Error("Failed to generate digest");

      toast({
        title: "Digest Generated",
        description: "Your daily digest has been created",
      });
    } catch (error) {
      console.error("Failed to generate digest:", error);
      toast({
        title: "Error",
        description: "Failed to generate digest",
        variant: "destructive",
      });
    }
  };

  // Calculate inbox count
  const inboxCount = items.filter((item) => item.needsReview).length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg">AI Todo</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {user.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium">{user.email?.split("@")[0]}</p>
                <p className="text-muted-foreground text-xs">
                  {user.email}
                </p>
              </div>
              <Separator className="my-1" />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Input Section */}
        <Card className="mb-6 border-2 border-dashed border-slate-200 bg-white/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Add New Item
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextInput onSubmit={handleTextSubmit} />
            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
            <VoiceRecorder onRecordingComplete={handleVoiceRecording} />
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-12">
            <TabsTrigger value="inbox" className="flex items-center gap-1.5">
              <Inbox className="h-4 w-4" />
              <span className="hidden sm:inline">Inbox</span>
              {inboxCount > 0 && (
                <span className="ml-1 h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">
                  {inboxCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="today" className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Today</span>
            </TabsTrigger>
            <TabsTrigger value="buckets" className="flex items-center gap-1.5">
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Buckets</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-1.5">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </TabsTrigger>
            <TabsTrigger value="digest" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Digest</span>
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <LoadingSkeleton count={4} />
          ) : (
            <>
              <TabsContent value="inbox" className="mt-4">
                <InboxView
                  items={items}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                />
              </TabsContent>

              <TabsContent value="today" className="mt-4">
                <TodayView
                  items={items}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                />
              </TabsContent>

              <TabsContent value="buckets" className="mt-4">
                <BucketsView
                  items={items}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                />
              </TabsContent>

              <TabsContent value="search" className="mt-4">
                <SearchView
                  items={items}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                />
              </TabsContent>

              <TabsContent value="digest" className="mt-4">
                <DigestView onRunDigest={handleRunDigest} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
}

