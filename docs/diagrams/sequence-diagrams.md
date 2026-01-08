# Sequence Diagrams

## 1. User Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Mobile as Mobile App
    participant Supabase as Supabase Auth
    participant API as Vercel API

    User->>Mobile: Enter email/password
    Mobile->>Supabase: signInWithPassword()
    Supabase-->>Mobile: Session (access_token, refresh_token)
    Mobile->>Mobile: Store session in AsyncStorage
    Mobile->>API: GET /api/items (Bearer token)
    API->>Supabase: Verify token
    Supabase-->>API: User info
    API-->>Mobile: Items data
    Mobile-->>User: Display items
```

## 2. Text Input Ingestion Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Mobile as Mobile App
    participant API as Vercel API
    participant OpenAI as OpenAI GPT-4o-mini
    participant DB as PostgreSQL

    User->>Mobile: Enter text "Buy groceries tomorrow"
    Mobile->>API: POST /api/ingest/text
    Note over API: Verify Bearer token
    API->>OpenAI: Classify text with GPT-4o-mini
    OpenAI-->>API: Classification result
    Note over API: {type: "todo", title: "Buy groceries", dueAt: "tomorrow", priority: "P1"}
    API->>DB: Create Item
    DB-->>API: Item created
    API-->>Mobile: {item, classification}
    Mobile-->>User: Show success, navigate to item
```

## 3. Voice Input Ingestion Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Mobile as Mobile App
    participant API as Vercel API
    participant Whisper as OpenAI Whisper
    participant GPT as OpenAI GPT-4o-mini
    participant DB as PostgreSQL

    User->>Mobile: Record voice memo
    Mobile->>Mobile: Save audio file (m4a)
    Mobile->>API: POST /api/ingest/voice (multipart)
    Note over API: Verify Bearer token
    API->>Whisper: Transcribe audio
    Whisper-->>API: Transcription text
    API->>GPT: Classify transcription
    GPT-->>API: Classification result
    API->>DB: Create Item with sourceType="voice"
    DB-->>API: Item created
    API-->>Mobile: {item, transcription, classification}
    Mobile-->>User: Show transcription & result
```

## 4. Daily Digest Cron Flow

```mermaid
sequenceDiagram
    autonumber
    participant Vercel as Vercel Cron
    participant API as /api/cron/daily-digest
    participant DB as PostgreSQL
    participant Expo as Expo Push Service
    participant Device as User's iPhone

    Vercel->>API: GET /api/cron/daily-digest?secret=xxx
    Note over API: Runs daily at 08:00 UTC
    API->>DB: Get users with digest enabled
    loop For each user
        API->>API: Check user timezone & preferred time
        alt Time matches
            API->>DB: Get user's items (overdue, due today, priorities)
            API->>API: Generate digest content
            API->>DB: Get user's push tokens
            API->>Expo: Send push notification
            Expo-->>Device: 📋 Your Daily Digest
            API->>DB: Log digest sent
        end
    end
    API-->>Vercel: {sent: N, skipped: M}
```

## 5. Push Token Registration Flow

```mermaid
sequenceDiagram
    autonumber
    participant Mobile as Mobile App
    participant Expo as Expo SDK
    participant API as Vercel API
    participant DB as PostgreSQL

    Mobile->>Expo: registerForPushNotificationsAsync()
    Expo-->>Mobile: ExpoPushToken
    Mobile->>API: POST /api/push/register
    Note over API: {expoPushToken, platform: "ios", deviceName}
    API->>DB: Upsert DevicePushToken
    DB-->>API: Token saved
    API-->>Mobile: Success
```

## 6. Item Update Flow (Optimistic UI)

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Mobile as Mobile App
    participant API as Vercel API
    participant DB as PostgreSQL

    User->>Mobile: Tap "Mark as done"
    Mobile->>Mobile: Optimistic update (show done)
    Mobile->>API: PATCH /api/items/:id {status: "done"}
    API->>DB: updateMany({id, userId}, {status: "done"})
    alt Success
        DB-->>API: Updated count: 1
        API-->>Mobile: {item: updated}
    else Not found / Not owner
        DB-->>API: Updated count: 0
        API-->>Mobile: 404 Not Found
        Mobile->>Mobile: Revert optimistic update
        Mobile->>API: GET /api/items (refetch)
    end
```

