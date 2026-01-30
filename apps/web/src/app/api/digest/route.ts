import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUser(request);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "7", 10);

    // Get recent digest logs
    const digestLogs = await prisma.digestLog.findMany({
      where: {
        userId,
        date: {
          gte: subDays(startOfDay(new Date()), limit),
        },
      },
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json({ digestLogs });
  } catch (error) {
    console.error("Get digests error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch digests" },
      { status: 500 }
    );
  }
}

