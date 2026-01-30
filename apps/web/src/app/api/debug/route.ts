import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyBearerToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toZonedTime, format } from "date-fns-tz";

/**
 * GET /api/debug
 * Debug endpoint to test auth and database connection
 */
export async function GET(request: NextRequest) {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  // Check auth header
  const authHeader = request.headers.get("authorization");
  results.authHeaderPresent = !!authHeader;
  results.authHeaderType = authHeader?.split(" ")[0] || null;

  // Try to verify token
  let userId: string | null = null;
  if (authHeader) {
    try {
      const tokenResult = await verifyBearerToken(authHeader);
      results.tokenValid = !!tokenResult;
      userId = tokenResult?.userId || null;
      results.userId = userId;
    } catch (error) {
      results.tokenError = error instanceof Error ? error.message : "Unknown error";
    }
  }

  // Try to get authenticated user
  try {
    userId = await getAuthenticatedUser(request);
    results.authenticatedUserId = userId;
  } catch (error) {
    results.authError = error instanceof Error ? error.message : "Unknown error";
  }

  // Test database connection
  try {
    const itemCount = await prisma.item.count();
    results.dbConnected = true;
    results.totalItems = itemCount;
  } catch (error) {
    results.dbConnected = false;
    results.dbError = error instanceof Error ? error.message : "Unknown error";
  }

  // Check digest settings for authenticated user
  if (userId) {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId },
      });
      
      if (settings) {
        const now = new Date();
        const userNow = toZonedTime(now, settings.timezone);
        const todayDate = format(userNow, "yyyy-MM-dd");
        
        let lastSentDate: string | null = null;
        if (settings.lastDigestSentAt) {
          const lastSentLocal = toZonedTime(settings.lastDigestSentAt, settings.timezone);
          lastSentDate = format(lastSentLocal, "yyyy-MM-dd");
        }
        
        const alreadySentToday = lastSentDate === todayDate;
        const wouldSendNow = settings.dailyDigestEnabled && !alreadySentToday;
        
        results.digestSettings = {
          enabled: settings.dailyDigestEnabled,
          preferredTime: settings.dailyDigestTime,
          timezone: settings.timezone,
          lastDigestSentAt: settings.lastDigestSentAt?.toISOString() || null,
          note: "Cron runs daily at 16:00 UTC (8 AM PST)",
        };
        
        results.digestDebug = {
          serverTimeUTC: now.toISOString(),
          userLocalTime: format(userNow, "yyyy-MM-dd HH:mm:ss"),
          todayDateLocal: todayDate,
          lastSentDateLocal: lastSentDate,
          alreadySentToday,
          wouldSendNow,
        };
        
        // Check push tokens
        const pushTokens = await prisma.devicePushToken.findMany({
          where: { userId, isEnabled: true },
          select: { id: true, deviceName: true, createdAt: true },
        });
        results.pushTokens = pushTokens.length;
        results.pushTokenDetails = pushTokens;
      } else {
        results.digestSettings = null;
        results.digestDebug = "No user settings found";
      }
    } catch (error) {
      results.digestError = error instanceof Error ? error.message : "Unknown error";
    }
  }

  // Check environment variables (existence only, not values)
  results.envVars = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    CRON_SECRET: !!process.env.CRON_SECRET,
  };

  return NextResponse.json(results);
}

