import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { ItemFilterSchema } from "@todo/shared";
import { Prisma } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";

/**
 * GET /api/mobile/items
 * 
 * Get items for the authenticated mobile user.
 * Requires bearer token authentication.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyMobileAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = {
      type: searchParams.get("type") || undefined,
      status: searchParams.get("status") || undefined,
      needsReview: searchParams.get("needsReview")
        ? searchParams.get("needsReview") === "true"
        : undefined,
      dueFrom: searchParams.get("dueFrom") || undefined,
      dueTo: searchParams.get("dueTo") || undefined,
      search: searchParams.get("search") || undefined,
      priority: searchParams.get("priority") || undefined,
    };

    const filters = ItemFilterSchema.parse(params);

    // Build where clause
    const where: Prisma.ItemWhereInput = {
      userId: auth.userId,
    };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.needsReview !== undefined) where.needsReview = filters.needsReview;
    if (filters.priority) where.priority = filters.priority;

    if (filters.dueFrom || filters.dueTo) {
      where.dueAt = {};
      if (filters.dueFrom) {
        where.dueAt.gte = startOfDay(new Date(filters.dueFrom));
      }
      if (filters.dueTo) {
        where.dueAt.lte = endOfDay(new Date(filters.dueTo));
      }
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { details: { contains: filters.search, mode: "insensitive" } },
        { tags: { has: filters.search } },
      ];
    }

    const items = await prisma.item.findMany({
      where,
      orderBy: [
        { dueAt: { sort: "asc", nulls: "last" } },
        { priority: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Mobile get items error:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

