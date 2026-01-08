# AI Classification Flow

## Overview

```mermaid
flowchart LR
    subgraph Input["📝 User Input"]
        TEXT[Text Input]
        VOICE[Voice Memo]
    end

    subgraph Transcription["🎤 Transcription"]
        VOICE --> WHISPER[OpenAI Whisper]
        WHISPER --> TRANSCRIPT[Transcribed Text]
    end

    subgraph Classification["🤖 AI Classification"]
        TEXT --> GPT[GPT-4o-mini]
        TRANSCRIPT --> GPT
        GPT --> RESULT[Classification Result]
    end

    subgraph Validation["✅ Validation"]
        RESULT --> ZOD[Zod Schema Validation]
        ZOD --> VALID{Valid?}
        VALID -->|Yes| ITEM[Create Item]
        VALID -->|No| REVIEW[Mark needsReview]
        REVIEW --> ITEM
    end

    subgraph Storage["💾 Storage"]
        ITEM --> DB[(PostgreSQL)]
    end
```

## GPT-4o-mini Classification Prompt

```mermaid
flowchart TB
    subgraph Prompt["System Prompt"]
        ROLE["You are a personal assistant that classifies user inputs"]
        RULES["Extract: type, title, details, dueAt, priority, tags"]
        TYPES["Types: todo, reminder, idea, note"]
        PRIORITY["Priority: P0 (urgent), P1 (high), P2 (normal)"]
    end

    subgraph UserInput["User Input"]
        EXAMPLE["'Remind me to call mom tomorrow at 3pm'"]
    end

    subgraph Output["Expected Output"]
        JSON["{
            type: 'reminder',
            title: 'Call mom',
            details: null,
            dueAt: '2026-01-09T15:00:00Z',
            priority: 'P1',
            tags: ['family', 'call'],
            confidence: 0.95
        }"]
    end

    Prompt --> UserInput --> Output
```

## Classification Logic

```mermaid
flowchart TB
    START[Receive User Input] --> DETECT{Source Type?}
    
    DETECT -->|Text| TEXT_PROCESS[Process as Text]
    DETECT -->|Voice| VOICE_PROCESS[Transcribe with Whisper]
    
    VOICE_PROCESS --> TEXT_PROCESS
    
    TEXT_PROCESS --> GPT_CALL[Call GPT-4o-mini]
    
    GPT_CALL --> PARSE[Parse JSON Response]
    
    PARSE --> VALIDATE{Zod Validation}
    
    VALIDATE -->|Pass| CHECK_CONF{Confidence > 0.7?}
    VALIDATE -->|Fail| FALLBACK[Use Fallback Values]
    
    CHECK_CONF -->|Yes| CREATE[Create Item]
    CHECK_CONF -->|No| FLAG[Flag for Review]
    
    FALLBACK --> FLAG
    FLAG --> CREATE
    
    CREATE --> SAVE[Save to Database]
    SAVE --> RESPOND[Return to Client]
```

## Zod Schema Validation

```typescript
const ClassificationSchema = z.object({
  type: z.enum(["todo", "reminder", "idea", "note"]),
  title: z.string().min(1).max(200),
  details: z.string().nullable(),
  dueAt: z.string().datetime().nullable(),
  priority: z.enum(["P0", "P1", "P2"]).nullable(),
  tags: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
});
```

## Type Classification Rules

```mermaid
flowchart TB
    subgraph Rules["Classification Heuristics"]
        TODO["📋 TODO
        - Action items
        - Tasks to complete
        - 'Need to...', 'Should...'"]
        
        REMINDER["⏰ REMINDER
        - Time-specific
        - 'Remind me...', 'Don't forget...'
        - Has specific date/time"]
        
        IDEA["💡 IDEA
        - Creative thoughts
        - 'What if...', 'Could try...'
        - No urgency"]
        
        NOTE["📝 NOTE
        - Information storage
        - Facts, references
        - No action required"]
    end
```

## Priority Assignment

| Priority | Criteria | Examples |
|----------|----------|----------|
| **P0** (Urgent) | Immediate action, critical | "ASAP", "urgent", "emergency", today |
| **P1** (High) | Important, time-bound | Deadlines within 48h, "important" |
| **P2** (Normal) | Standard priority | Default, no urgency indicators |
| **null** | No priority | Notes, ideas without deadlines |

## Confidence Scoring

The AI returns a confidence score (0-1) based on:

- **High (0.8-1.0)**: Clear intent, specific details, matches patterns
- **Medium (0.5-0.8)**: Ambiguous phrasing, missing context
- **Low (0-0.5)**: Very unclear, multiple interpretations possible

Items with confidence < 0.7 are flagged as `needsReview: true` and appear in the Inbox for user verification.

## Error Handling

```mermaid
flowchart TB
    API_CALL[API Call to OpenAI] --> RESPONSE{Response OK?}
    
    RESPONSE -->|Yes| PARSE[Parse JSON]
    RESPONSE -->|No| RETRY{Retries < 3?}
    
    RETRY -->|Yes| WAIT[Wait 1s] --> API_CALL
    RETRY -->|No| FALLBACK_ERR[Return Error]
    
    PARSE --> VALID{Valid JSON?}
    
    VALID -->|Yes| ZOD[Zod Validate]
    VALID -->|No| DEFAULT[Use Defaults]
    
    ZOD --> ZOD_OK{Schema Valid?}
    
    ZOD_OK -->|Yes| SUCCESS[Return Classification]
    ZOD_OK -->|No| DEFAULT
    
    DEFAULT --> FLAG_REVIEW[Set needsReview = true]
    FLAG_REVIEW --> SUCCESS
```

