import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET_MOBILE || process.env.NEXTAUTH_SECRET || "dev-secret"
);

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 90;
const DEVICE_CODE_EXPIRY_MINUTES = 10;

/**
 * Generate a random device code (6 alphanumeric characters, uppercase)
 */
export function generateDeviceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars like 0, O, 1, I
  let code = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Hash a string using SHA-256
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a random refresh token
 */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate a random device ID
 */
export function generateDeviceId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Create a signed JWT access token
 */
export async function createAccessToken(
  userId: string,
  deviceId: string
): Promise<string> {
  return new SignJWT({ userId, deviceId, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT access token
 */
export async function verifyAccessToken(
  token: string
): Promise<{ userId: string; deviceId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "access") return null;
    return {
      userId: payload.userId as string,
      deviceId: payload.deviceId as string,
    };
  } catch {
    return null;
  }
}

/**
 * Create a device code for pairing
 */
export async function createDeviceCodeForUser(userId: string): Promise<string> {
  // Clean up expired codes for this user
  await prisma.deviceCode.deleteMany({
    where: {
      userId,
      OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
    },
  });

  const code = generateDeviceCode();
  const codeHash = hashToken(code);
  const expiresAt = new Date(
    Date.now() + DEVICE_CODE_EXPIRY_MINUTES * 60 * 1000
  );

  await prisma.deviceCode.create({
    data: {
      userId,
      codeHash,
      expiresAt,
    },
  });

  return code;
}

/**
 * Exchange a device code for access and refresh tokens
 */
export async function exchangeDeviceCode(
  code: string,
  deviceName?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  const codeHash = hashToken(code.toUpperCase());

  // Find valid device code
  const deviceCode = await prisma.deviceCode.findFirst({
    where: {
      codeHash,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!deviceCode) {
    return null;
  }

  // Mark code as used
  await prisma.deviceCode.update({
    where: { id: deviceCode.id },
    data: { usedAt: new Date() },
  });

  // Generate tokens
  const deviceId = generateDeviceId();
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const refreshExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      userId: deviceCode.userId,
      tokenHash: refreshTokenHash,
      deviceId,
      deviceName,
      expiresAt: refreshExpiresAt,
    },
  });

  // Create access token
  const accessToken = await createAccessToken(deviceCode.userId, deviceId);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  const tokenHash = hashToken(refreshToken);

  // Find valid refresh token
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
      revokedAt: null,
    },
  });

  if (!storedToken) {
    return null;
  }

  // Rotate refresh token (optional but more secure)
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Update the token (rotate)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: {
      tokenHash: newRefreshTokenHash,
      expiresAt: newExpiresAt,
      lastUsedAt: new Date(),
    },
  });

  // Create new access token
  const accessToken = await createAccessToken(
    storedToken.userId,
    storedToken.deviceId
  );

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 15 * 60,
  };
}

/**
 * Revoke a refresh token (logout)
 */
export async function revokeRefreshToken(refreshToken: string): Promise<boolean> {
  const tokenHash = hashToken(refreshToken);

  const result = await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return result.count > 0;
}

/**
 * Middleware helper to verify mobile auth from request
 */
export async function verifyMobileAuth(
  request: NextRequest
): Promise<{ userId: string; deviceId: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  return verifyAccessToken(token);
}

/**
 * Get user ID from either mobile auth or NextAuth session
 */
export async function getAuthUserId(request: NextRequest): Promise<string | null> {
  // Try mobile auth first
  const mobileAuth = await verifyMobileAuth(request);
  if (mobileAuth) {
    return mobileAuth.userId;
  }

  // Fall back to session auth (for web)
  // This is handled separately in the route handlers
  return null;
}

// Simple in-memory rate limiting for exchange endpoint
const exchangeAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempt = exchangeAttempts.get(ip);

  if (!attempt || attempt.resetAt < now) {
    exchangeAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    return false;
  }

  attempt.count++;
  return true;
}

