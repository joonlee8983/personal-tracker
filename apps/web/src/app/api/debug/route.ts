import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, verifyBearerToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/debug
 * Debug endpoint to test auth and database connection
 */
export async function GET(request: NextRequest) {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  // Check auth header
  const authHeader = request.headers.get("authorization");
  results.authHeaderPresent = !!authHeader;
  results.authHeaderType = authHeader?.split(" ")[0] || null;

  // Try to verify token
  if (authHeader) {
    try {
      const tokenResult = await verifyBearerToken(authHeader);
      results.tokenValid = !!tokenResult;
      results.userId = tokenResult?.userId || null;
    } catch (error) {
      results.tokenError = error instanceof Error ? error.message : "Unknown error";
    }
  }

  // Try to get authenticated user
  try {
    const userId = await getAuthenticatedUser(request);
    results.authenticatedUserId = userId;
  } catch (error) {
    results.authError = error instanceof Error ? error.message : "Unknown error";
  }

  // Test database connection
  try {
    const itemCount = await prisma.item.count();
    results.dbConnected = true;
    results.totalItems = itemCount;
  } catch (error) {
    results.dbConnected = false;
    results.dbError = error instanceof Error ? error.message : "Unknown error";
  }

  // Check environment variables (existence only, not values)
  results.envVars = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
  };

  return NextResponse.json(results);
}

