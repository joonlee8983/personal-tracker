# Deployment Architecture

## Infrastructure Overview

```mermaid
flowchart TB
    subgraph Users["👥 Users"]
        IPHONE[iPhone App]
        WEB[Web Browser]
    end

    subgraph CDN["🌐 Distribution"]
        APP_STORE[App Store / TestFlight]
        VERCEL_EDGE[Vercel Edge Network]
    end

    subgraph Compute["⚡ Compute"]
        subgraph Vercel["Vercel"]
            FUNCTIONS[Serverless Functions]
            STATIC[Static Assets]
            CRON[Cron Jobs]
        end
    end

    subgraph Data["💾 Data Layer"]
        subgraph Supabase["Supabase"]
            SB_AUTH[Auth Service]
            SB_DB[(PostgreSQL)]
            SB_POOLER[Connection Pooler]
        end
    end

    subgraph External["🔌 External APIs"]
        OPENAI[OpenAI API]
        EXPO_PUSH[Expo Push Service]
    end

    %% User connections
    IPHONE --> APP_STORE
    IPHONE --> VERCEL_EDGE
    WEB --> VERCEL_EDGE

    %% Vercel internal
    VERCEL_EDGE --> FUNCTIONS
    VERCEL_EDGE --> STATIC

    %% Function connections
    FUNCTIONS --> SB_POOLER
    SB_POOLER --> SB_DB
    FUNCTIONS --> SB_AUTH
    FUNCTIONS --> OPENAI
    FUNCTIONS --> EXPO_PUSH
    CRON --> FUNCTIONS

    %% Mobile auth
    IPHONE -.-> SB_AUTH

    classDef user fill:#e0f2fe,stroke:#0284c7
    classDef cdn fill:#fef3c7,stroke:#d97706
    classDef compute fill:#dcfce7,stroke:#16a34a
    classDef data fill:#f3e8ff,stroke:#9333ea
    classDef external fill:#fee2e2,stroke:#dc2626

    class IPHONE,WEB user
    class APP_STORE,VERCEL_EDGE cdn
    class FUNCTIONS,STATIC,CRON compute
    class SB_AUTH,SB_DB,SB_POOLER data
    class OPENAI,EXPO_PUSH external
```

## Environment Configuration

### Vercel Environment Variables

```
┌─────────────────────────────────┬────────────────────────────────────┐
│ Variable                        │ Description                        │
├─────────────────────────────────┼────────────────────────────────────┤
│ NEXT_PUBLIC_SUPABASE_URL        │ Supabase project URL               │
│ NEXT_PUBLIC_SUPABASE_ANON_KEY   │ Supabase anon/public key           │
│ SUPABASE_SERVICE_ROLE_KEY       │ Supabase service role (server)     │
│ DATABASE_URL                    │ PostgreSQL connection (pooler)     │
│ OPENAI_API_KEY                  │ OpenAI API key                     │
│ CRON_SECRET                     │ Secret for cron authentication     │
└─────────────────────────────────┴────────────────────────────────────┘
```

### EAS Build Secrets

```
┌─────────────────────────────────┬────────────────────────────────────┐
│ Secret                          │ Description                        │
├─────────────────────────────────┼────────────────────────────────────┤
│ EXPO_PUBLIC_API_BASE_URL        │ Vercel deployment URL              │
│ EXPO_PUBLIC_SUPABASE_URL        │ Supabase project URL               │
│ EXPO_PUBLIC_SUPABASE_ANON_KEY   │ Supabase anon/public key           │
└─────────────────────────────────┴────────────────────────────────────┘
```

### Supabase Configuration

```
┌─────────────────────────────────┬────────────────────────────────────┐
│ Setting                         │ Value                              │
├─────────────────────────────────┼────────────────────────────────────┤
│ Site URL                        │ https://[app].vercel.app           │
│ Redirect URLs                   │ https://[app].vercel.app/**        │
│                                 │ ai-todo://auth/callback            │
└─────────────────────────────────┴────────────────────────────────────┘
```

## CI/CD Pipeline

```mermaid
flowchart LR
    subgraph Dev["Development"]
        CODE[Code Changes]
        CODE --> COMMIT[Git Commit]
    end

    subgraph CI["Continuous Integration"]
        COMMIT --> PUSH[Git Push]
        PUSH --> VERCEL_BUILD[Vercel Build]
    end

    subgraph Deploy["Deployment"]
        VERCEL_BUILD --> PREVIEW[Preview Deploy]
        PREVIEW --> PROD[Production Deploy]
    end

    subgraph Mobile["Mobile Build"]
        COMMIT --> EAS_BUILD[EAS Build]
        EAS_BUILD --> TESTFLIGHT[TestFlight]
        TESTFLIGHT --> APP_STORE_PROD[App Store]
    end
```

## Database Connection Strategy

```mermaid
flowchart TB
    subgraph Vercel["Vercel Serverless"]
        F1[Function Instance 1]
        F2[Function Instance 2]
        F3[Function Instance N]
    end

    subgraph Supabase["Supabase"]
        subgraph Pooler["PgBouncer Pooler"]
            TRANSACTION[Transaction Mode :6543]
        end
        DB[(PostgreSQL)]
    end

    F1 --> TRANSACTION
    F2 --> TRANSACTION
    F3 --> TRANSACTION
    TRANSACTION --> DB

    note1[/"Serverless functions use
    connection pooler to avoid
    exhausting database connections"/]
```

## Cron Job Configuration

```yaml
# vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest?secret=${CRON_SECRET}",
      "schedule": "0 8 * * *"  # Daily at 08:00 UTC
    }
  ]
}
```

## Mobile App Distribution

```mermaid
flowchart TB
    subgraph Build["EAS Build"]
        CODE[Source Code] --> EAS[EAS CLI]
        EAS --> |"--profile development"| DEV[Dev Client .app]
        EAS --> |"--profile preview"| PREVIEW[Preview .ipa]
        EAS --> |"--profile production"| PROD[Production .ipa]
    end

    subgraph Distribution["Distribution"]
        DEV --> SIMULATOR[iOS Simulator]
        DEV --> DEVICE_DEV[Device Direct Install]
        PREVIEW --> DEVICE_PREVIEW[Internal Testing]
        PROD --> TESTFLIGHT_D[TestFlight]
        TESTFLIGHT_D --> APP_STORE_D[App Store]
    end
```

## Security Architecture

```mermaid
flowchart TB
    subgraph Mobile["Mobile App"]
        APP[App] --> TOKEN[Access Token]
    end

    subgraph API["API Layer"]
        TOKEN --> |"Bearer Token"| MIDDLEWARE[Auth Middleware]
        MIDDLEWARE --> VERIFY[Verify with Supabase]
        VERIFY --> |"Valid"| HANDLER[API Handler]
        VERIFY --> |"Invalid"| REJECT[401 Unauthorized]
    end

    subgraph Database["Database"]
        HANDLER --> PRISMA[Prisma Client]
        PRISMA --> |"userId filter"| DB[(PostgreSQL)]
        DB --> |"RLS Policies"| DATA[User's Data Only]
    end

    subgraph Supabase["Supabase Auth"]
        APP --> |"Email/Password"| AUTH[signInWithPassword]
        AUTH --> |"JWT"| TOKEN
        VERIFY --> AUTH
    end
```

