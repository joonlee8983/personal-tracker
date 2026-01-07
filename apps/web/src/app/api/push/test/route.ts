import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getUserPushTokens, sendPushNotifications } from "@/lib/push";

/**
 * POST /api/push/test
 * 
 * Send a test push notification to the authenticated user.
 * Requires bearer token authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tokens = await getUserPushTokens(userId);
    
    if (tokens.length === 0) {
      return NextResponse.json(
        { error: "No push tokens registered" },
        { status: 400 }
      );
    }

    const result = await sendPushNotifications(tokens, {
      title: "🔔 Test Notification",
      body: "If you see this, push notifications are working!",
      data: { screen: "settings" },
    });

    return NextResponse.json({
      success: true,
      message: `Test notification sent to ${result.success} device(s)`,
      sent: result.success,
      failed: result.failed,
    });
  } catch (error) {
    console.error("Test push error:", error);

    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}

