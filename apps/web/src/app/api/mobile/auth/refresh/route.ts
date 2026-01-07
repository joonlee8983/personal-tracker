import { NextRequest, NextResponse } from "next/server";
import { RefreshTokenRequestSchema } from "@todo/shared";
import { refreshAccessToken } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/auth/refresh
 * 
 * Refreshes an access token using a refresh token.
 * Returns new access token and rotated refresh token.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = RefreshTokenRequestSchema.parse(body);

    const tokens = await refreshAccessToken(refreshToken);

    if (!tokens) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      ...tokens,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}

