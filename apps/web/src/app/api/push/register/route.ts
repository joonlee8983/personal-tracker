import { NextRequest, NextResponse } from "next/server";
import { PushTokenRegisterSchema } from "@todo/shared";
import { getAuthenticatedUser } from "@/lib/auth";
import { registerPushToken } from "@/lib/push";

/**
 * POST /api/push/register
 * 
 * Register an Expo push token for the authenticated user.
 * Requires bearer token authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { expoPushToken, platform, deviceName } = PushTokenRegisterSchema.parse(body);

    await registerPushToken(
      userId,
      expoPushToken,
      platform,
      deviceName
    );

    return NextResponse.json({
      success: true,
      message: "Push token registered successfully",
    });
  } catch (error) {
    console.error("Register push token error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to register push token" },
      { status: 500 }
    );
  }
}

