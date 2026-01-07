"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DeviceCodeGenerator() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateCode = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/device-code/create", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to generate code");
      }

      const data = await res.json();
      setCode(data.code);
      setExpiresAt(new Date(Date.now() + data.expiresIn * 1000));
      setCopied(false);

      toast({
        title: "Device Code Generated",
        description: "Enter this code in your mobile app within 10 minutes.",
      });
    } catch (error) {
      console.error("Failed to generate code:", error);
      toast({
        title: "Error",
        description: "Failed to generate device code",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Device code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  const isExpired = expiresAt && expiresAt < new Date();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mobile App Pairing
        </CardTitle>
        <CardDescription>
          Generate a code to pair your mobile device with your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {code && !isExpired ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="text-4xl font-mono font-bold tracking-widest bg-muted px-6 py-4 rounded-lg">
                {code.split("").map((char, i) => (
                  <span key={i} className="inline-block">
                    {char}
                  </span>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyCode}
                className="h-12 w-12"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              Expires in{" "}
              <CountdownTimer expiresAt={expiresAt!} onExpire={() => setCode(null)} />
            </p>

            <div className="flex justify-center">
              <Button variant="outline" onClick={generateCode} disabled={isGenerating}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
                Generate New Code
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Generate a one-time code to securely connect your mobile device.
              Open the AI Todo app on your phone and enter this code.
            </p>
            <Button onClick={generateCode} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Generate Device Code
                </>
              )}
            </Button>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">How to pair:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Download the AI Todo app on your iPhone</li>
            <li>Open the app and tap &quot;Pair Device&quot;</li>
            <li>Enter the 6-character code shown above</li>
            <li>Your device will be connected to your account</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

function CountdownTimer({
  expiresAt,
  onExpire,
}: {
  expiresAt: Date;
  onExpire: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useState(() => {
    const interval = setInterval(() => {
      const diff = expiresAt.getTime() - Date.now();
      const seconds = Math.max(0, Math.floor(diff / 1000));
      setTimeLeft(seconds);

      if (seconds <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  });

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <span className="font-mono">
      {minutes}:{seconds.toString().padStart(2, "0")}
    </span>
  );
}

