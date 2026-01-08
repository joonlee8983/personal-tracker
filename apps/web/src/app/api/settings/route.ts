import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/settings
 * Get user settings
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create settings
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId,
          dailyDigestEnabled: true,
          dailyDigestTime: "08:00",
          timezone: "America/Los_Angeles",
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings
 * Update user settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dailyDigestEnabled, dailyDigestTime, timezone } = body;

    const updateData: Record<string, unknown> = {};
    if (typeof dailyDigestEnabled === "boolean") {
      updateData.dailyDigestEnabled = dailyDigestEnabled;
    }
    if (dailyDigestTime) {
      updateData.dailyDigestTime = dailyDigestTime;
    }
    if (timezone) {
      updateData.timezone = timezone;
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        dailyDigestEnabled: dailyDigestEnabled ?? true,
        dailyDigestTime: dailyDigestTime ?? "08:00",
        timezone: timezone ?? "America/Los_Angeles",
      },
      update: updateData,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

