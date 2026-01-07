import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processIngest } from "@/lib/agent";
import { TextIngestRequestSchema } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const body = await request.json();
    const { text } = TextIngestRequestSchema.parse(body);

    // Process with AI agent
    const { classification, needsReview } = await processIngest(text, "text");

    // Save to database
    const item = await prisma.item.create({
      data: {
        userId,
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
    console.error("Text ingest error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to process text" },
      { status: 500 }
    );
  }
}

