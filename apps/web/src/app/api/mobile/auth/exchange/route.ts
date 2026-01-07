import { NextRequest, NextResponse } from "next/server";
import { DeviceCodeExchangeSchema } from "@todo/shared";
import { exchangeDeviceCode, checkRateLimit } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/auth/exchange
 * 
 * Exchanges a device code for access and refresh tokens.
 * No authentication required (this IS the authentication).
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown";
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { code } = DeviceCodeExchangeSchema.parse(body);

    // Get device name from user agent
    const userAgent = request.headers.get("user-agent") || "Unknown Device";
    const deviceName = parseDeviceName(userAgent);

    const tokens = await exchangeDeviceCode(code, deviceName);

    if (!tokens) {
      return NextResponse.json(
        { error: "Invalid or expired device code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      ...tokens,
    });
  } catch (error) {
    console.error("Exchange device code error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to exchange device code" },
      { status: 500 }
    );
  }
}

function parseDeviceName(userAgent: string): string {
  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("iPad")) return "iPad";
  if (userAgent.includes("Android")) return "Android Device";
  if (userAgent.includes("Expo")) return "Expo App";
  return "Mobile Device";
}

