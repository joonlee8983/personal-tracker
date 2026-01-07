# AI Todo - Personal Task Manager

A mobile-first personal task manager with AI-powered classification. Capture tasks via text or voice, and the AI automatically classifies them into todos, reminders, ideas, or notes.

## Features

- 🎤 **Voice & Text Input** - Capture tasks naturally via voice memos or text
- 🤖 **AI Classification** - GPT-4o-mini automatically categorizes and extracts metadata
- 📱 **Native Mobile App** - iOS app built with Expo for the best mobile experience
- 🔔 **Daily Digest Push** - Morning notifications with your tasks for the day
- 📊 **Smart Views** - Inbox, Today, Buckets, and Search
- 🔐 **Secure Auth** - Device pairing with JWT tokens (no WebView cookies)

## Architecture

```
personal-todo-app/
├── apps/
│   ├── web/           # Next.js 15 (App Router) - Backend + Web UI
│   └── mobile/        # Expo SDK 54 (React Native) - iOS App
├── packages/
│   └── shared/        # Shared TypeScript types and Zod schemas
├── pnpm-workspace.yaml
└── turbo.json
```

## Tech Stack

### Backend (apps/web)
- Next.js 15 (App Router)
- PostgreSQL + Prisma ORM
- NextAuth.js (web sessions)
- JWT Bearer tokens (mobile auth)
- OpenAI GPT-4o-mini + Whisper
- Expo Server SDK (push notifications)
- Resend (optional email)

### Mobile (apps/mobile)
- Expo SDK 54 + Expo Router
- React Native 0.81
- expo-notifications (push)
- expo-audio (voice recording)
- expo-secure-store (token storage)

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **pnpm 9+** - Install with `npm install -g pnpm`
- **Docker** - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Expo Go app** - Install on your iPhone from the App Store
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd personal-todo-app
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up the Database

Start PostgreSQL with Docker:

```bash
docker run --name todo-postgres -d \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=todo \
  -p 5432:5432 \
  postgres:15
```

### 4. Configure Environment Variables

Create the environment file for the web app:

```bash
cp apps/web/env.example apps/web/.env
```

Edit `apps/web/.env` and fill in your values:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todo?schema=public"

# NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-random-secret-here"

# Mobile Auth (generate with: openssl rand -base64 32)
JWT_SECRET_MOBILE="another-random-secret-here"

# Cron Secret (generate with: openssl rand -base64 32)
CRON_SECRET="your-cron-secret-here"

# OpenAI (required for AI classification)
OPENAI_API_KEY="sk-your-openai-api-key"

# Optional: Email digests via Resend
# RESEND_API_KEY=""
# RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

### 5. Initialize the Database

```bash
cd apps/web
pnpm db:push      # Push schema to database
pnpm db:generate  # Generate Prisma client
cd ../..
```

### 6. Start the Web Backend

```bash
pnpm dev:web
```

The web app will be running at **http://localhost:3000**

### 7. Configure the Mobile App

Get your computer's local IP address:

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'

# Windows
ipconfig | findstr /i "IPv4"
```

Create the mobile environment file:

```bash
echo "EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP_ADDRESS:3000" > apps/mobile/.env
```

Replace `YOUR_IP_ADDRESS` with your actual IP (e.g., `192.168.1.100`).

### 8. Start the Mobile App

```bash
cd apps/mobile
npx expo start --tunnel
```

Scan the QR code with your iPhone camera to open in Expo Go.

---

## Pairing Your Mobile Device

1. Open **http://localhost:3000** in your browser
2. Sign in with any email (demo authentication)
3. Go to **Settings** (gear icon or `/settings`)
4. Click **"Generate Device Code"**
5. Enter the 6-character code in the mobile app
6. You're connected!

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
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio (DB GUI) |

### Mobile App (apps/mobile)

| Command | Description |
|---------|-------------|
| `npx expo start` | Start Expo dev server |
| `npx expo start --tunnel` | Start with tunnel (recommended) |
| `npx expo start --clear` | Start with cache cleared |

---

## Database Management

### Start PostgreSQL

```bash
docker start todo-postgres
```

### Stop PostgreSQL

```bash
docker stop todo-postgres
```

### View Database with Prisma Studio

```bash
cd apps/web
pnpm db:studio
```

Opens a GUI at http://localhost:5555

### Reset Database

```bash
docker stop todo-postgres
docker rm todo-postgres
# Then re-run the docker run command from step 3
```

---

## API Endpoints

### Web Authentication (NextAuth)
- `GET /auth/signin` - Sign in page

### Mobile Authentication
- `POST /api/device-code/create` - Generate pairing code (requires web session)
- `POST /api/mobile/auth/exchange` - Exchange code for tokens
- `POST /api/mobile/auth/refresh` - Refresh access token
- `POST /api/mobile/auth/logout` - Revoke tokens

### Mobile API (Bearer token required)
- `GET /api/mobile/items` - List items with filters
- `GET /api/mobile/items/:id` - Get single item
- `PATCH /api/mobile/items/:id` - Update item
- `DELETE /api/mobile/items/:id` - Delete item
- `POST /api/mobile/ingest/text` - Process text input
- `POST /api/mobile/ingest/voice` - Process voice memo
- `GET /api/mobile/settings` - Get user settings
- `PATCH /api/mobile/settings` - Update settings

### Push Notifications
- `POST /api/push/register` - Register Expo push token
- `POST /api/push/unregister` - Remove push token
- `POST /api/push/test` - Send test notification

### Cron
- `POST /api/cron/daily-digest?secret=CRON_SECRET` - Trigger digest

---

## Deployment

### Vercel (Backend)

1. Push your code to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Set the root directory to `apps/web`
4. Add environment variables:
   - `DATABASE_URL` (use [Neon](https://neon.tech), [Supabase](https://supabase.com), or similar)
   - `NEXTAUTH_URL` (your production URL)
   - `NEXTAUTH_SECRET`
   - `JWT_SECRET_MOBILE`
   - `CRON_SECRET`
   - `OPENAI_API_KEY`
5. Deploy

The cron job for daily digests is configured in `apps/web/vercel.json` to run hourly.

### TestFlight (iOS App)

Push notifications require a development build (not Expo Go):

```bash
cd apps/mobile

# Login to Expo
npx eas login

# Initialize project
npx eas init

# Build for TestFlight
npx eas build --profile production --platform ios

# Submit to App Store Connect
npx eas submit --platform ios
```

---

## Troubleshooting

### Database Connection Error (P1001)

```
Error: Can't reach database server at localhost:5432
```

**Fix:** Make sure Docker is running and the container is started:
```bash
docker start todo-postgres
```

### Mobile App Can't Connect

```
Network request failed
```

**Fix:**
1. Ensure your phone and computer are on the same WiFi network
2. Check that you're using your computer's IP (not `localhost`) in `apps/mobile/.env`
3. Try using tunnel mode: `npx expo start --tunnel`

### React Native Version Mismatch

```
Incompatible React versions
```

**Fix:** Make sure you're using Expo Go that matches SDK 54. Update Expo Go from the App Store if needed.

### OpenAI API Errors

```
Failed to process text/voice
```

**Fix:** Verify your `OPENAI_API_KEY` in `apps/web/.env` is valid and has credits.

### Keyboard Covering Input

If the keyboard blocks input fields, the app should handle this automatically. If not, try reloading the app.

---

## Project Structure

```
apps/web/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── auth/          # Auth pages
│   │   └── settings/      # Settings page
│   ├── components/        # React components
│   └── lib/               # Utilities (auth, push, etc.)
└── vercel.json            # Cron configuration

apps/mobile/
├── app/
│   ├── (tabs)/            # Tab screens (Today, Inbox, etc.)
│   ├── auth/              # Pairing screen
│   ├── capture/           # Text & voice capture
│   └── item/              # Item detail screen
├── src/
│   ├── components/        # React Native components
│   ├── hooks/             # Custom hooks
│   └── lib/               # API client, auth, storage
├── app.json               # Expo config
└── eas.json               # EAS Build config

packages/shared/
└── src/
    ├── types.ts           # TypeScript types
    └── schemas.ts         # Zod validation schemas
```

---

## License

MIT
