import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { UserSettingsUpdateSchema } from "@todo/shared";

/**
 * GET /api/mobile/settings
 * 
 * Get user settings for the authenticated mobile user.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyMobileAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId: auth.userId },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: auth.userId,
          dailyDigestEnabled: true,
          dailyDigestTime: "08:00",
          timezone: "America/Los_Angeles",
        },
      });
    }

    return NextResponse.json({
      settings: {
        dailyDigestEnabled: settings.dailyDigestEnabled,
        dailyDigestTime: settings.dailyDigestTime,
        timezone: settings.timezone,
      },
    });
  } catch (error) {
    console.error("Mobile get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mobile/settings
 * 
 * Update user settings for the authenticated mobile user.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyMobileAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates = UserSettingsUpdateSchema.parse(body);

    const settings = await prisma.userSettings.upsert({
      where: { userId: auth.userId },
      create: {
        userId: auth.userId,
        dailyDigestEnabled: updates.dailyDigestEnabled ?? true,
        dailyDigestTime: updates.dailyDigestTime ?? "08:00",
        timezone: updates.timezone ?? "America/Los_Angeles",
      },
      update: updates,
    });

    return NextResponse.json({
      settings: {
        dailyDigestEnabled: settings.dailyDigestEnabled,
        dailyDigestTime: settings.dailyDigestTime,
        timezone: settings.timezone,
      },
    });
  } catch (error) {
    console.error("Mobile update settings error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

