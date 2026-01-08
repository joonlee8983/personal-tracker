# Application Diagrams

This directory contains technical diagrams documenting the AI Todo App architecture and flows.

## Diagrams

| File | Description |
|------|-------------|
| [system-architecture.md](./system-architecture.md) | High-level system architecture showing all components |
| [sequence-diagrams.md](./sequence-diagrams.md) | Key user flows: auth, ingestion, digest, etc. |
| [database-schema.md](./database-schema.md) | Entity-relationship diagram and table descriptions |
| [mobile-app-structure.md](./mobile-app-structure.md) | Mobile app navigation and component hierarchy |
| [ai-classification-flow.md](./ai-classification-flow.md) | AI agent classification logic and validation |
| [deployment-architecture.md](./deployment-architecture.md) | Deployment, CI/CD, and infrastructure |

## Viewing Diagrams

All diagrams use **Mermaid** syntax and can be viewed in:

- **GitHub** - Native Mermaid rendering in markdown files
- **VS Code** - Install "Markdown Preview Mermaid Support" extension
- **Obsidian** - Native Mermaid support
- **Online** - [Mermaid Live Editor](https://mermaid.live/)

## Quick Reference

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        MOBILE APP                          │
│  Expo SDK 54 | React Native | Expo Router | TypeScript     │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API + Bearer Token
┌─────────────────────────▼───────────────────────────────────┐
│                        BACKEND                              │
│  Next.js 16 | App Router | Prisma | Vercel Serverless      │
└──────┬──────────────────┬───────────────────────┬──────────┘
       │                  │                       │
┌──────▼──────┐   ┌───────▼───────┐   ┌──────────▼──────────┐
│  Supabase   │   │    OpenAI     │   │    Expo Push       │
│  Auth + DB  │   │  GPT/Whisper  │   │    Service         │
└─────────────┘   └───────────────┘   └────────────────────┘
```

### Key Flows

1. **Authentication**: Supabase Auth → JWT → Bearer token in API calls
2. **Text Ingestion**: User input → GPT-4o-mini → Zod validation → Database
3. **Voice Ingestion**: Audio → Whisper → Text → GPT → Database
4. **Daily Digest**: Vercel Cron → Query items → Expo Push notification

### Data Model

```
User (Supabase Auth)
 ├── Items (tasks, reminders, ideas, notes)
 ├── UserSettings (digest preferences)
 ├── DevicePushTokens (Expo tokens)
 └── DigestLogs (delivery history)
```

