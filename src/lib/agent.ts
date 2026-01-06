import OpenAI from "openai";
import { AgentClassificationSchema, type AgentClassification } from "@/types";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

const SYSTEM_PROMPT = `You are an AI assistant that classifies personal notes, tasks, and ideas. Given a piece of text (which may be a voice transcription), extract structured information.

CLASSIFICATION RULES:
1. "todo" - An actionable task with clear completion criteria
2. "reminder" - Something time-sensitive that needs attention at a specific time (MUST have a date/time)
3. "idea" - A creative thought, concept, or something to explore later
4. "note" - General information to remember, observations, or reference material

OUTPUT FORMAT (strict JSON):
{
  "type": "todo" | "reminder" | "idea" | "note",
  "title": "Short, actionable title (max 100 chars)",
  "details": "Additional context or details (can be empty string)",
  "dueAt": "ISO 8601 datetime string or null",
  "priority": "P0" | "P1" | "P2" | null,
  "tags": ["relevant", "tags"],
  "confidence": 0.0-1.0,
  "followUpQuestions": ["Questions if clarification needed"]
}

PRIORITY RULES:
- P0: Urgent and important, needs immediate attention
- P1: Important but not urgent, should be done soon
- P2: Nice to have, can wait
- null: No clear priority

CONFIDENCE SCORING:
- 0.9-1.0: Very clear intent, all information present
- 0.7-0.89: Reasonably clear, minor ambiguity
- 0.5-0.69: Some uncertainty, may need clarification
- Below 0.5: Very unclear, definitely needs review

DATE PARSING:
- "tomorrow" = next day
- "next week" = 7 days from now
- "monday" = upcoming Monday
- "in 2 hours" = 2 hours from now
- If no time specified for a date, default to 9:00 AM

RULES:
- If classified as "reminder" but no date can be determined, set confidence below 0.65
- Extract meaningful tags from context (work, personal, health, finance, etc.)
- Keep titles concise and action-oriented for todos
- If the input is unclear or nonsensical, set low confidence and add follow-up questions

Current datetime for reference: ${new Date().toISOString()}`;

/**
 * Classify text input using OpenAI
 */
export async function classifyText(text: string): Promise<AgentClassification> {
  const response = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3, // Lower temperature for more deterministic output
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const parsed = JSON.parse(content);
  const validated = AgentClassificationSchema.parse(parsed);

  return validated;
}

/**
 * Determine if an item needs review based on classification
 */
export function shouldNeedReview(classification: AgentClassification): boolean {
  // Low confidence always needs review
  if (classification.confidence < 0.65) {
    return true;
  }

  // Reminders without due dates need review
  if (classification.type === "reminder" && !classification.dueAt) {
    return true;
  }

  // If there are follow-up questions, likely needs review
  if (classification.followUpQuestions.length > 0) {
    return true;
  }

  return false;
}

/**
 * Process raw text and return structured item data
 */
export async function processIngest(
  text: string,
  _sourceType: "text" | "voice" | "telegram"
): Promise<{
  classification: AgentClassification;
  needsReview: boolean;
}> {
  const classification = await classifyText(text);
  const needsReview = shouldNeedReview(classification);

  return {
    classification,
    needsReview,
  };
}

