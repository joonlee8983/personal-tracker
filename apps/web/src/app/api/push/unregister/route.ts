import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { unregisterPushToken } from "@/lib/push";

const UnregisterSchema = z.object({
  expoPushToken: z.string().min(1),
});

/**
 * POST /api/push/unregister
 * 
 * Unregister an Expo push token.
 * Requires bearer token authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { expoPushToken } = UnregisterSchema.parse(body);

    await unregisterPushToken(userId, expoPushToken);

    return NextResponse.json({
      success: true,
      message: "Push token unregistered successfully",
    });
  } catch (error) {
    console.error("Unregister push token error:", error);

    return NextResponse.json(
      { error: "Failed to unregister push token" },
      { status: 500 }
    );
  }
}

