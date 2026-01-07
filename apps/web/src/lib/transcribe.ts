import OpenAI from "openai";
import { toFile } from "openai";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Transcribe audio buffer using OpenAI Whisper API
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string = "audio.webm"
): Promise<string> {
  // Convert buffer to File object for OpenAI
  const file = await toFile(audioBuffer, filename, {
    type: getMimeType(filename),
  });

  const transcription = await getOpenAI().audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "en", // Can be made configurable
    response_format: "text",
  });

  return transcription;
}

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    webm: "audio/webm",
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    m4a: "audio/m4a",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
  };
  return mimeTypes[ext || "webm"] || "audio/webm";
}

