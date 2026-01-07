import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { processIngest } from "@/lib/agent";
import { TextIngestRequestSchema } from "@todo/shared";

/**
 * POST /api/mobile/ingest/text
 * 
 * Process text input for the authenticated mobile user.
 * Requires bearer token authentication.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyMobileAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text } = TextIngestRequestSchema.parse(body);

    // Process with AI agent
    const { classification, needsReview } = await processIngest(text, "text");

    // Save to database
    const item = await prisma.item.create({
      data: {
        userId: auth.userId,
        type: classification.type,
        title: classification.title,
        details: classification.details || null,
        dueAt: classification.dueAt ? new Date(classification.dueAt) : null,
        priority: classification.priority,
        tags: classification.tags,
        sourceType: "text",
        sourceText: text,
        needsReview,
        agentConfidence: classification.confidence,
        agentRawJson: classification as object,
      },
    });

    return NextResponse.json({
      success: true,
      item,
      classification,
      needsReview,
    });
  } catch (error) {
    console.error("Mobile text ingest error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process text" },
      { status: 500 }
    );
  }
}

