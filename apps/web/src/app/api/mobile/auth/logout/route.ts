import { NextRequest, NextResponse } from "next/server";
import { RefreshTokenRequestSchema } from "@todo/shared";
import { revokeRefreshToken } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/auth/logout
 * 
 * Revokes a refresh token (logout from device).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = RefreshTokenRequestSchema.parse(body);

    await revokeRefreshToken(refreshToken);

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      { error: "Failed to logout" },
      { status: 500 }
    );
  }
}

