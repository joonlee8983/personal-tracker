import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { processIngest } from "@/lib/agent";
import { transcribeAudio } from "@/lib/transcribe";

/**
 * POST /api/mobile/ingest/voice
 * 
 * Process voice memo for the authenticated mobile user.
 * Requires bearer token authentication.
 * Expects multipart/form-data with "audio" file.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyMobileAuth(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the audio file from form data
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcribe audio
    const transcription = await transcribeAudio(buffer, audioFile.name);

    if (!transcription || transcription.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not transcribe audio" },
        { status: 400 }
      );
    }

    // Process with AI agent
    const { classification, needsReview } = await processIngest(
      transcription,
      "voice"
    );

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
        sourceType: "voice",
        sourceText: transcription,
        needsReview,
        agentConfidence: classification.confidence,
        agentRawJson: classification as object,
      },
    });

    return NextResponse.json({
      success: true,
      item,
      transcription,
      classification,
      needsReview,
    });
  } catch (error) {
    console.error("Mobile voice ingest error:", error);

    return NextResponse.json(
      { error: "Failed to process voice memo" },
      { status: 500 }
    );
  }
}

