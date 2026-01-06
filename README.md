# AI Todo - Smart Personal Task Manager

A production-ready personal to-do app with an AI agent that ingests text or voice memos, classifies them (todo/reminder/idea/note), extracts metadata, and stores items in the correct bucket. Includes a daily morning digest feature.

## Features

- 🎤 **Voice & Text Input**: Record voice memos or type text - the AI will classify and extract details
- 🤖 **AI Classification**: Automatically categorizes items as todo/reminder/idea/note
- 📊 **Smart Metadata Extraction**: Extracts title, details, due date, priority, and tags
- 📥 **Inbox Review**: Low-confidence items are routed to inbox for manual review
- 📅 **Daily Digest**: Morning summary of priorities, due items, and overdue tasks
- 🔍 **Search & Buckets**: Organized views for easy item management

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js
- **AI**: OpenAI GPT-4o-mini + Whisper API
- **Email**: Resend (optional)

## Prerequisites

- Node.js 18+ and pnpm
- Docker (for local PostgreSQL) or a PostgreSQL database
- OpenAI API key
- (Optional) Resend API key for email digests
- (Optional) Google OAuth credentials

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd personal-todo-app
pnpm install
```

### 2. Start PostgreSQL with Docker

```bash
# Start a PostgreSQL container
docker run --name aitodo-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aitodo \
  -p 5432:5432 \
  -d postgres:15
```

**Docker commands for later:**
```bash
docker stop aitodo-postgres   # Stop the database
docker start aitodo-postgres  # Start it again
docker rm aitodo-postgres     # Remove the container (data will be lost)
```

### 3. Environment Setup

```bash
cp env.example .env
```

Edit `.env` with your credentials:

```env
# Database - use this if running Docker locally
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aitodo?schema=public"

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# OpenAI API (required for AI features)
OPENAI_API_KEY="sk-your-openai-api-key"
OPENAI_MODEL="gpt-4o-mini"

# Digest Settings
DIGEST_TIMEZONE="America/Los_Angeles"

# Cron Secret (generate with: openssl rand -base64 32)
CRON_SECRET="your-cron-secret"
```

### 4. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# (Optional) Seed sample data
pnpm db:seed
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

Sign in with any email (demo mode) and start adding items!

> ⚠️ **Note**: The app will work for viewing UI without an OpenAI API key, but text/voice ingestion requires it.

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run migrations (production) |
| `pnpm db:studio` | Open Prisma Studio (database GUI) |
| `pnpm db:seed` | Seed sample data |
| `pnpm digest:run` | Run daily digest manually |

## How It Works

### Ingestion Pipeline

1. **Input**: User submits text or records voice memo
2. **Transcription** (voice only): Audio → OpenAI Whisper → Text
3. **Classification**: Text → GPT-4o-mini → Structured JSON
4. **Validation**: Zod schema validates agent output
5. **Guardrails**: Apply deterministic rules:
   - If confidence < 0.65 → `needsReview = true`
   - If type=reminder but no dueAt → `needsReview = true`
6. **Storage**: Save to database with raw agent JSON for debugging
7. **Routing**: Item goes to appropriate view (or Inbox if needs review)

### Agent Output Schema

```typescript
{
  type: "todo" | "reminder" | "idea" | "note",
  title: string,        // Short, max 200 chars
  details: string,      // Additional context
  dueAt: ISO | null,    // Due date/time
  priority: "P0" | "P1" | "P2" | null,
  tags: string[],       // Extracted tags
  confidence: 0..1,     // Agent confidence score
  followUpQuestions: string[]  // If clarification needed
}
```

### Daily Digest

The digest runs daily at 8:00 AM (configurable timezone) and includes:
- Top 3-5 priority items (P0/P1)
- Items due today
- Overdue items
- Total active items count

**Delivery options:**
1. **Email**: Uses Resend API (requires `RESEND_API_KEY`)
2. **In-app**: Always stored as DigestLog, viewable in Digest tab

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ingest/text` | POST | Process text input |
| `/api/ingest/voice` | POST | Process voice memo (multipart/form-data) |
| `/api/items` | GET | List items with filters |
| `/api/items/[id]` | GET/PATCH/DELETE | Item CRUD operations |
| `/api/digest` | GET | Get recent digest logs |
| `/api/digest/run` | POST/GET | Trigger digest generation |

## Running the Daily Digest

### Manual Run

```bash
# Via script
pnpm digest:run

# Via API (authenticated user)
curl -X POST http://localhost:3000/api/digest/run

# Via API (cron/scheduler)
curl -X GET "http://localhost:3000/api/digest/run?secret=YOUR_CRON_SECRET"
```

### Scheduled (Production)

**Vercel Cron** (recommended for Vercel deployments):
Already configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/digest/run?secret=${CRON_SECRET}",
    "schedule": "0 8 * * *"
  }]
}
```

**Upstash QStash**:
```bash
curl -X POST https://qstash.upstash.io/v2/schedules \
  -H "Authorization: Bearer YOUR_QSTASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "https://your-app.vercel.app/api/digest/run",
    "cron": "0 15 * * *",
    "headers": {"x-cron-secret": "YOUR_CRON_SECRET"}
  }'
```
Note: 0 15 UTC = 8 AM Pacific (during standard time)

**External Cron Services**:
Point your cron service to:
```
GET https://your-domain.com/api/digest/run?secret=YOUR_CRON_SECRET
```

## Extending: Telegram Integration

To add Telegram as an input source:

1. Create a Telegram bot via BotFather
2. Add new API route `/api/ingest/telegram`
3. Set up webhook to receive messages
4. Use same `processIngest()` function with `sourceType: "telegram"`

```typescript
// Example structure for /api/ingest/telegram
export async function POST(req: Request) {
  const update = await req.json();
  const message = update.message?.text || "";
  const telegramUserId = update.message?.from?.id;
  
  // Map Telegram user to app user (implement user linking)
  const userId = await getUserIdFromTelegram(telegramUserId);
  
  // Process same as text ingest
  const { classification, needsReview } = await processIngest(message, "telegram");
  
  // Save to DB
  await prisma.item.create({
    data: {
      userId,
      sourceType: "telegram",
      sourceText: message,
      ...classification,
      needsReview,
    }
  });
  
  // Optionally reply to user
  return new Response("ok");
}
```

## Project Structure

```
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Sample data seeder
├── scripts/
│   └── run-digest.ts      # Manual digest runner
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── auth/          # Auth pages
│   │   └── page.tsx       # Main app page
│   ├── components/
│   │   ├── ui/            # shadcn components
│   │   ├── views/         # Tab views
│   │   └── *.tsx          # App components
│   ├── hooks/             # React hooks
│   ├── lib/
│   │   ├── agent.ts       # AI classification
│   │   ├── auth.ts        # NextAuth config
│   │   ├── digest.ts      # Digest generation
│   │   ├── prisma.ts      # DB client
│   │   ├── transcribe.ts  # Whisper API
│   │   └── utils.ts       # Utilities
│   └── types/             # TypeScript types
├── env.example            # Environment template
├── vercel.json            # Vercel cron config
├── package.json
└── README.md
```

## Troubleshooting

**Database connection error (`P1001: Can't reach database server`)**
- Make sure PostgreSQL is running: `docker start aitodo-postgres`
- Check your `DATABASE_URL` in `.env`

**"Could not access microphone"**
- Check browser permissions
- Must use HTTPS in production (or localhost)

**"Failed to process voice memo" or text ingestion not working**
- Verify `OPENAI_API_KEY` is set in `.env`
- Check the API key is valid and has credits

**Digest not sending emails**
- Verify `RESEND_API_KEY` is set
- Check `DIGEST_FROM_EMAIL` domain is verified in Resend

**Items not classifying correctly**
- Review raw agent JSON in database (`agentRawJson` field)
- Use `pnpm db:studio` to inspect data
- Adjust prompts in `src/lib/agent.ts` if needed

## License

MIT
