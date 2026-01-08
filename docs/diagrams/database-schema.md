# Database Schema (Entity Relationship Diagram)

```mermaid
erDiagram
    AUTH_USERS ||--o{ ITEM : "creates"
    AUTH_USERS ||--o| USER_SETTINGS : "has"
    AUTH_USERS ||--o{ DEVICE_PUSH_TOKEN : "registers"
    AUTH_USERS ||--o{ DIGEST_LOG : "receives"

    AUTH_USERS {
        uuid id PK "Managed by Supabase Auth"
        string email
        timestamp created_at
    }

    ITEM {
        string id PK "cuid()"
        uuid userId FK
        enum type "todo|reminder|idea|note"
        string title
        text details
        enum status "active|done|archived"
        timestamp dueAt
        enum priority "P0|P1|P2|null"
        array tags "string[]"
        enum sourceType "text|voice|telegram"
        text sourceText "Original input"
        string sourceAudioUrl "Voice memo URL"
        boolean needsReview "AI confidence low"
        float agentConfidence
        json agentRawJson "Raw AI response"
        timestamp createdAt
        timestamp updatedAt
    }

    USER_SETTINGS {
        string id PK "cuid()"
        uuid userId FK UK "unique"
        boolean dailyDigestEnabled "default: true"
        string dailyDigestTime "HH:MM format"
        string timezone "IANA timezone"
        timestamp lastDigestSentAt
        timestamp createdAt
        timestamp updatedAt
    }

    DEVICE_PUSH_TOKEN {
        string id PK "cuid()"
        uuid userId FK
        string expoPushToken UK "unique"
        string platform "ios|android"
        string deviceName
        string deviceId
        boolean isEnabled "default: true"
        timestamp lastSeenAt
        timestamp createdAt
    }

    DIGEST_LOG {
        string id PK "cuid()"
        uuid userId FK
        date date "Digest date"
        timestamp sentAt
        string sentVia "push|email|in_app"
        timestamp pushSentAt
        text content "Rendered digest"
        array itemsIncluded "string[] item IDs"
        timestamp createdAt
    }
```

## Table Descriptions

### Item
The main table storing all user tasks, reminders, ideas, and notes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (cuid) |
| `userId` | UUID | Supabase auth user ID |
| `type` | ENUM | todo, reminder, idea, note |
| `title` | TEXT | Item title (extracted by AI) |
| `details` | TEXT | Additional details |
| `status` | ENUM | active, done, archived |
| `dueAt` | TIMESTAMP | Due date/time |
| `priority` | ENUM | P0 (urgent), P1 (high), P2 (normal) |
| `tags` | TEXT[] | Array of tags |
| `sourceType` | ENUM | text, voice, telegram |
| `sourceText` | TEXT | Original user input or transcription |
| `sourceAudioUrl` | TEXT | URL to voice recording |
| `needsReview` | BOOLEAN | True if AI confidence is low |
| `agentConfidence` | FLOAT | AI confidence score 0-1 |
| `agentRawJson` | JSONB | Full AI response for debugging |

### UserSettings
User preferences for digest and notifications.

| Column | Type | Description |
|--------|------|-------------|
| `userId` | UUID | Unique, references auth.users |
| `dailyDigestEnabled` | BOOLEAN | Whether to send daily digest |
| `dailyDigestTime` | TEXT | Preferred time (e.g., "08:00") |
| `timezone` | TEXT | User's timezone (e.g., "America/Los_Angeles") |
| `lastDigestSentAt` | TIMESTAMP | Prevents duplicate digests |

### DevicePushToken
Expo push notification tokens for user devices.

| Column | Type | Description |
|--------|------|-------------|
| `expoPushToken` | TEXT | Unique Expo push token |
| `platform` | TEXT | "ios" or "android" |
| `deviceName` | TEXT | Human-readable device name |
| `isEnabled` | BOOLEAN | False if token is invalid |

### DigestLog
History of sent daily digests.

| Column | Type | Description |
|--------|------|-------------|
| `date` | DATE | The date of the digest |
| `sentVia` | TEXT | Delivery method (push, email, in_app) |
| `content` | TEXT | Rendered markdown content |
| `itemsIncluded` | TEXT[] | IDs of items in digest |

## Indexes

```sql
-- Item indexes for efficient queries
CREATE INDEX "Item_userId_status_idx" ON "Item"("userId", "status");
CREATE INDEX "Item_userId_type_idx" ON "Item"("userId", "type");
CREATE INDEX "Item_userId_dueAt_idx" ON "Item"("userId", "dueAt");
CREATE INDEX "Item_userId_needsReview_idx" ON "Item"("userId", "needsReview");

-- DevicePushToken indexes
CREATE INDEX "DevicePushToken_userId_idx" ON "DevicePushToken"("userId");
CREATE INDEX "DevicePushToken_isEnabled_idx" ON "DevicePushToken"("isEnabled");

-- DigestLog indexes
CREATE INDEX "DigestLog_userId_date_idx" ON "DigestLog"("userId", "date");
```

## Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data:

```sql
-- Example policy for Item table
CREATE POLICY "Users can view own items" ON "Item"
    FOR SELECT USING (auth.uid() = "userId");
CREATE POLICY "Users can insert own items" ON "Item"
    FOR INSERT WITH CHECK (auth.uid() = "userId");
CREATE POLICY "Users can update own items" ON "Item"
    FOR UPDATE USING (auth.uid() = "userId");
CREATE POLICY "Users can delete own items" ON "Item"
    FOR DELETE USING (auth.uid() = "userId");
```

