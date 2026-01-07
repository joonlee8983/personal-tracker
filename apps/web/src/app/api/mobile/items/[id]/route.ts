import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { ItemUpdateSchema } from "@todo/shared";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/mobile/items/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifyMobileAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const item = await prisma.item.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Mobile get item error:", error);
    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mobile/items/[id]
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifyMobileAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const updates = ItemUpdateSchema.parse(body);

    // Verify ownership
    const existing = await prisma.item.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Parameters<typeof prisma.item.update>[0]["data"] = {};

    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.details !== undefined) updateData.details = updates.details;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.needsReview !== undefined) updateData.needsReview = updates.needsReview;

    if (updates.dueAt !== undefined) {
      updateData.dueAt = updates.dueAt ? new Date(updates.dueAt) : null;
    }

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Mobile update item error:", error);
    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mobile/items/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifyMobileAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.item.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.item.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mobile delete item error:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

