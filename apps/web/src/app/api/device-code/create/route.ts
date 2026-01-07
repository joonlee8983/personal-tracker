import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createDeviceCodeForUser } from "@/lib/mobile-auth";

/**
 * POST /api/device-code/create
 * 
 * Creates a device pairing code for the authenticated user.
 * Requires web session authentication.
 */
export async function POST() {
  try {
    const userId = await requireAuth();
    
    const code = await createDeviceCodeForUser(userId);

    return NextResponse.json({
      success: true,
      code,
      expiresIn: 600, // 10 minutes in seconds
      message: "Enter this code in your mobile app to pair the device",
    });
  } catch (error) {
    console.error("Create device code error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to create device code" },
      { status: 500 }
    );
  }
}

