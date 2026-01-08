# AI Todo - Personal Task Manager

A mobile-first personal task manager with AI-powered classification. Capture tasks via text or voice, and the AI automatically classifies them into todos, reminders, ideas, or notes.

## Features

- 🎤 **Voice & Text Input** - Capture tasks naturally via voice memos or text
- 🤖 **AI Classification** - GPT-4o-mini automatically categorizes and extracts metadata
- 📱 **Native Mobile App** - iOS app built with Expo for the best mobile experience
- 🔔 **Daily Digest Push** - Morning notifications with your tasks for the day
- 📊 **Smart Views** - Inbox, Today, Buckets, and Search
- 🔐 **Supabase Auth** - Secure email/password authentication

## Architecture

```
personal-todo-app/
├── apps/
│   ├── web/           # Next.js 16 (App Router) - Backend + Web UI
│   └── mobile/        # Expo SDK 54 (React Native) - iOS App
├── packages/
│   └── shared/        # Shared TypeScript types and Zod schemas
├── pnpm-workspace.yaml
└── turbo.json
```

## Tech Stack

### Backend (apps/web)
- Next.js 16 (App Router)
- Supabase (Auth + PostgreSQL)
- Prisma ORM
- OpenAI GPT-4o-mini + Whisper
- Expo Server SDK (push notifications)
- Resend (optional email digests)

### Mobile (apps/mobile)
- Expo SDK 54 + Expo Router
- React Native 0.81
- Supabase Auth (native)
- expo-notifications (push)
- expo-audio (voice recording)

---

## Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **pnpm 9+** - Install with `npm install -g pnpm`
- **Supabase Account** - [Sign up](https://supabase.com)
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)
- **Apple Developer Account** (for iOS app) - [Enroll](https://developer.apple.com)

---

## Quick Start (Local Development)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd personal-todo-app
pnpm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy:
   - Project URL
   - Anon public key
   - Service role key
3. Go to **Project Settings → Database** and copy the connection string

### 3. Configure Environment Variables

**Web App (`apps/web/.env`):**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Database (Supabase connection string)
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# OpenAI (required for AI classification)
OPENAI_API_KEY="sk-your-openai-api-key"

# Cron Secret (generate with: openssl rand -base64 32)
CRON_SECRET="your-cron-secret-here"

# Optional: Email digests via Resend
# RESEND_API_KEY=""
# RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

**Mobile App (`apps/mobile/.env`):**

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# API URL (use local IP for development, Vercel URL for production)
EXPO_PUBLIC_API_BASE_URL="http://YOUR_LOCAL_IP:3000"
```

### 4. Initialize Database

```bash
cd apps/web
pnpm db:push      # Push Prisma schema to Supabase
pnpm db:generate  # Generate Prisma client
cd ../..
```

### 5. Start Development

```bash
# Terminal 1: Start web backend
pnpm dev:web

# Terminal 2: Start mobile app
cd apps/mobile
npx expo start --tunnel
```

Scan the QR code with your iPhone to open in Expo Go.

---

## Production Deployment

### Deploy Backend to Vercel

1. Push code to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Configure:
   - **Root Directory:** `apps/web`
   - **Install Command:** `cd ../.. && pnpm install`
4. Add environment variables:
   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service role key |
   | `DATABASE_URL` | Supabase connection string |
   | `OPENAI_API_KEY` | Your OpenAI key |
   | `CRON_SECRET` | Random string for cron auth |
5. Deploy!

### Build iOS App with EAS

```bash
cd apps/mobile

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Initialize project (first time only)
eas init

# Build for internal testing (install on your device)
eas build --platform ios --profile preview

# Build for App Store (when ready)
eas build --platform ios --profile production
eas submit --platform ios
```

---

## API Endpoints

### Authentication (Supabase)
- Sign up/in handled by Supabase client on web and mobile

### Items API (Bearer token required)
- `GET /api/items` - List items with filters
- `GET /api/items/:id` - Get single item
- `PATCH /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Ingest API (Bearer token required)
- `POST /api/ingest/text` - Process text input
- `POST /api/ingest/voice` - Process voice memo (multipart form)

### Push Notifications (Bearer token required)
- `POST /api/push/register` - Register Expo push token
- `POST /api/push/unregister` - Remove push token
- `POST /api/push/test` - Send test notification

### Cron (requires CRON_SECRET)
- `GET /api/cron/daily-digest?secret=CRON_SECRET` - Trigger daily digest

---

## Project Commands

### Root (Monorepo)

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Run all apps in development |
| `pnpm dev:web` | Run web app only |
| `pnpm dev:mobile` | Run mobile app only |
| `pnpm build` | Build all apps |

### Web App (apps/web)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:studio` | Open Prisma Studio (DB GUI) |

### Mobile App (apps/mobile)

| Command | Description |
|---------|-------------|
| `npx expo start` | Start Expo dev server |
| `npx expo start --tunnel` | Start with tunnel (recommended) |
| `eas build --platform ios` | Build iOS app |

---

## Troubleshooting

### Database Connection Error
```
Can't reach database server
```
**Fix:** Check your `DATABASE_URL` in `.env` is correct and Supabase project is running.

### Mobile App Can't Connect to API
```
Network request failed
```
**Fix:**
1. For local dev: Use your computer's IP (not `localhost`) in `EXPO_PUBLIC_API_BASE_URL`
2. For production: Use your Vercel URL
3. Try tunnel mode: `npx expo start --tunnel`

### Push Notifications Not Working
**Fix:** Push notifications require an EAS development build, not Expo Go.
```bash
eas build --platform ios --profile development
```

### OpenAI API Errors
```
Failed to process text/voice
```
**Fix:** Verify your `OPENAI_API_KEY` is valid and has credits.

---

## Project Structure

```
apps/web/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── auth/          # Auth pages (signin, callback)
│   │   └── settings/      # Settings page
│   ├── components/        # React components
│   └── lib/
│       ├── supabase/      # Supabase clients (server, browser)
│       ├── auth.ts        # Auth helpers
│       └── push.ts        # Push notification helpers
└── vercel.json            # Cron configuration

apps/mobile/
├── app/
│   ├── (tabs)/            # Tab screens (Today, Inbox, Buckets, etc.)
│   ├── auth/              # Login screen
│   ├── capture/           # Text & voice capture
│   └── item/              # Item detail screen
├── src/
│   ├── components/        # React Native components
│   ├── hooks/             # Custom hooks (useAuth)
│   └── lib/
│       ├── supabase.ts    # Supabase client
│       └── api.ts         # API client
├── app.json               # Expo config
└── eas.json               # EAS Build config

packages/shared/
└── src/
    ├── types.ts           # TypeScript types
    └── schemas.ts         # Zod validation schemas
```

---

## Summary of Changes (Migration from NextAuth to Supabase)

- ✅ Replaced NextAuth with Supabase Auth
- ✅ Replaced device-code pairing with native Supabase auth
- ✅ Using Supabase Postgres via Prisma
- ✅ Deployed backend to Vercel
- ✅ iOS app built with EAS for TestFlight/device install
- ✅ Updated all API routes to use Supabase JWT verification

---

## License

MIT
