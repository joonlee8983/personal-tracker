import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { runDigestForUser, runDigestForAllUsers } from "@/lib/digest";

/**
 * POST /api/digest/run
 * 
 * Run digest manually:
 * - If authenticated user calls it, runs for that user
 * - If called with CRON_SECRET header, runs for all users (for scheduler)
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    
    // Check if this is a cron job call
    if (cronSecret) {
      if (cronSecret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Invalid cron secret" }, { status: 401 });
      }

      // Run for all users
      const result = await runDigestForAllUsers();
      return NextResponse.json({
        success: true,
        message: "Digest run completed for all users",
        ...result,
      });
    }

    // Otherwise, run for authenticated user
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const sendEmail = body.sendEmail !== false;

    const result = await runDigestForUser(userId, sendEmail);
    
    return NextResponse.json({
      success: true,
      message: "Digest generated successfully",
      ...result,
    });
  } catch (error) {
    console.error("Run digest error:", error);
    return NextResponse.json(
      { error: "Failed to run digest" },
      { status: 500 }
    );
  }
}

// Also support GET for simple cron services that only do GET requests
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret") || 
                     new URL(request.url).searchParams.get("secret");

  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Invalid cron secret" }, { status: 401 });
  }

  try {
    const result = await runDigestForAllUsers();
    return NextResponse.json({
      success: true,
      message: "Digest run completed for all users",
      ...result,
    });
  } catch (error) {
    console.error("Run digest error:", error);
    return NextResponse.json(
      { error: "Failed to run digest" },
      { status: 500 }
    );
  }
}

