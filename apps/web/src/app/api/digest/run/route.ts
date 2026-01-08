import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { runDigestForUser } from "@/lib/digest";

/**
 * POST /api/digest/run
 * 
 * Run digest manually for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await runDigestForUser(userId);
    
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
