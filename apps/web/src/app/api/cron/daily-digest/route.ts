import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDigestData, formatDigestContent, sendDigestEmail } from "@/lib/digest";
import { sendDigestPush } from "@/lib/push";
import { toZonedTime, format } from "date-fns-tz";

/**
 * POST/GET /api/cron/daily-digest
 * 
 * Hourly cron job to send daily digest notifications.
 * Checks each user's timezone and preferred time.
 * Requires CRON_SECRET for authentication.
 */
export async function GET(request: NextRequest) {
  return handleDigestCron(request);
}

export async function POST(request: NextRequest) {
  return handleDigestCron(request);
}

async function handleDigestCron(request: NextRequest) {
  // Verify cron secret
  const cronSecret =
    request.headers.get("x-cron-secret") ||
    new URL(request.url).searchParams.get("secret");

  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Digest Cron] Starting hourly digest check...");

  try {
    // Get all users with digest enabled
    const users = await prisma.user.findMany({
      where: {
        settings: {
          dailyDigestEnabled: true,
        },
      },
      include: {
        settings: true,
        pushTokens: {
          where: { isEnabled: true },
          select: { expoPushToken: true },
        },
      },
    });

    console.log(`[Digest Cron] Found ${users.length} users with digest enabled`);

    const results = {
      checked: users.length,
      sent: 0,
      skipped: 0,
      errors: 0,
    };

    for (const user of users) {
      try {
        const settings = user.settings || {
          dailyDigestTime: "08:00",
          timezone: "America/Los_Angeles",
          lastDigestSentAt: null,
        };

        // Check if it's time to send for this user
        const shouldSend = isTimeToSend(
          settings.timezone,
          settings.dailyDigestTime,
          settings.lastDigestSentAt
        );

        if (!shouldSend) {
          results.skipped++;
          continue;
        }

        console.log(`[Digest Cron] Sending digest to user ${user.id}`);

        // Generate digest data
        const digestData = await generateDigestData(user.id);
        const content = formatDigestContent(digestData);

        // Create summary for push notification
        const pushSummary = createPushSummary(digestData);

        // Track what was sent
        let pushSent = false;
        let emailSent = false;

        // Send push notification if user has tokens
        if (user.pushTokens.length > 0) {
          pushSent = await sendDigestPush(user.id, pushSummary);
        }

        // Send email if user has email
        if (user.email) {
          try {
            emailSent = await sendDigestEmail(user.email, digestData);
          } catch (error) {
            console.error(`[Digest Cron] Email failed for user ${user.id}:`, error);
          }
        }

        // Store digest log
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await prisma.digestLog.upsert({
          where: {
            userId_date: {
              userId: user.id,
              date: today,
            },
          },
          create: {
            userId: user.id,
            date: today,
            content,
            itemsIncluded: [
              ...digestData.topPriorities.map((i) => i.id),
              ...digestData.dueToday.map((i) => i.id),
              ...digestData.overdue.map((i) => i.id),
            ],
            sentVia: pushSent ? "push" : emailSent ? "email" : "in_app",
            sentAt: new Date(),
            pushSentAt: pushSent ? new Date() : null,
          },
          update: {
            content,
            itemsIncluded: [
              ...digestData.topPriorities.map((i) => i.id),
              ...digestData.dueToday.map((i) => i.id),
              ...digestData.overdue.map((i) => i.id),
            ],
            sentVia: pushSent ? "push" : emailSent ? "email" : "in_app",
            sentAt: new Date(),
            pushSentAt: pushSent ? new Date() : null,
          },
        });

        // Update last sent timestamp
        await prisma.userSettings.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            lastDigestSentAt: new Date(),
          },
          update: {
            lastDigestSentAt: new Date(),
          },
        });

        results.sent++;
        console.log(
          `[Digest Cron] Sent to user ${user.id} - push: ${pushSent}, email: ${emailSent}`
        );
      } catch (error) {
        console.error(`[Digest Cron] Error for user ${user.id}:`, error);
        results.errors++;
      }
    }

    console.log(`[Digest Cron] Complete:`, results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("[Digest Cron] Fatal error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Check if it's time to send digest for a user based on their timezone and preferred time
 */
function isTimeToSend(
  timezone: string,
  preferredTime: string, // "HH:MM"
  lastSentAt: Date | null
): boolean {
  try {
    const now = new Date();
    const userNow = toZonedTime(now, timezone);
    // toZonedTime already converts to the timezone, so format without timeZone option
    const currentHour = parseInt(format(userNow, "HH"));
    const [preferredHour] = preferredTime.split(":").map(Number);

    // Check if current hour matches preferred hour
    if (currentHour !== preferredHour) {
      return false;
    }

    // Check if already sent today
    if (lastSentAt) {
      const lastSentLocal = toZonedTime(lastSentAt, timezone);
      const lastSentDate = format(lastSentLocal, "yyyy-MM-dd");
      const todayDate = format(userNow, "yyyy-MM-dd");

      if (lastSentDate === todayDate) {
        return false; // Already sent today
      }
    }

    return true;
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`, error);
    return false;
  }
}

/**
 * Create a short summary for push notification
 */
function createPushSummary(data: {
  topPriorities: { title: string }[];
  dueToday: { title: string }[];
  overdue: { title: string }[];
  totalActive: number;
}): string {
  const parts: string[] = [];

  if (data.overdue.length > 0) {
    parts.push(`⚠️ ${data.overdue.length} overdue`);
  }

  if (data.dueToday.length > 0) {
    parts.push(`📅 ${data.dueToday.length} due today`);
  }

  if (data.topPriorities.length > 0) {
    const topTask = data.topPriorities[0].title;
    const truncated =
      topTask.length > 30 ? topTask.slice(0, 30) + "..." : topTask;
    parts.push(`🎯 Top: ${truncated}`);
  }

  if (parts.length === 0) {
    return `You have ${data.totalActive} active items. Have a great day!`;
  }

  return parts.join(" • ");
}

