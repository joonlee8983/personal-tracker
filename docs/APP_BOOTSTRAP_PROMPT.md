# APP_BOOTSTRAP_PROMPT.md

> **Copy-paste this entire prompt into Cursor to bootstrap a new production app.**
> 
> This prompt produces a minimal, verified, production-ready foundation.
> Do NOT add features until all checkpoints pass.

---

## INSTRUCTIONS FOR CURSOR

You are a senior full-stack engineer. Your job is to create a **minimal, production-verified** application foundation.

**CRITICAL RULES:**
1. Do NOT add features beyond what each phase specifies
2. Do NOT proceed to the next phase until the checkpoint passes
3. Do NOT use complex architectures (no monorepo, no microservices)
4. Do NOT add auth before the hello world is deployed
5. Every phase ends with a verification step — wait for user confirmation

---

## PHASE 0 — DECISIONS (Ask User)

Before writing any code, ask me to confirm:

```
I need you to lock in these decisions:

1. PLATFORM
   □ Web only
   □ Web + iOS Mobile

2. AUTH PROVIDER
   □ Supabase Auth (recommended for mobile)
   □ NextAuth (web-only, cookie-based)

3. DATABASE
   □ Supabase Postgres (recommended)
   □ Other: ___________

4. APP NAME: ___________

5. DOMAIN (if known): ___________

Please confirm these choices. I will not proceed until they are locked.
```

**Wait for user response before continuing.**

---

## PHASE 1 — HELLO WORLD TO PRODUCTION

### Goal
Deploy a Next.js app to Vercel with one API endpoint. Verify it works in production.

### Steps

1. Create Next.js app:
```bash
npx create-next-app@latest [APP_NAME] --typescript --tailwind --app --no-src-dir --no-import-alias
cd [APP_NAME]
```

2. Create health check endpoint:

**`app/api/health/route.ts`**
```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
}
```

3. Update home page to show app is running:

**`app/page.tsx`**
```typescript
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">[APP_NAME]</h1>
      <p className="mt-4 text-gray-600">Deployment verified ✓</p>
    </main>
  );
}
```

4. Create `.env.example`:
```
# Add environment variables here as they are needed
```

5. Deploy to Vercel:
```bash
npx vercel
```

### CHECKPOINT 1
```
Verify these before proceeding:

□ App is deployed to Vercel (you have a .vercel.app URL)
□ Homepage loads in browser
□ curl https://[YOUR_APP].vercel.app/api/health returns {"ok":true,...}

Type "CHECKPOINT 1 PASSED" to continue.
```

**Wait for user confirmation.**

---

## PHASE 2 — DATABASE WIRING

### Goal
Connect to Supabase Postgres. Verify database connectivity in production.

### Steps

1. Create Supabase project at https://supabase.com/dashboard

2. Get connection strings from **Settings → Database**:
   - Copy the **Transaction pooler** connection string (port 6543)
   - It should look like: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

3. Add Prisma:
```bash
npm install prisma @prisma/client
npx prisma init
```

4. Update `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Minimal test model
model HealthCheck {
  id        String   @id @default(cuid())
  checkedAt DateTime @default(now())
}
```

5. Create `.env` (local only, never commit):
```
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

6. Push schema:
```bash
npx prisma db push
npx prisma generate
```

7. Create Prisma client:

**`lib/prisma.ts`**
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

8. Create DB health endpoint:

**`app/api/db-health/route.ts`**
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Write a health check record
    await prisma.healthCheck.create({ data: {} });
    const count = await prisma.healthCheck.count();
    
    return NextResponse.json({
      ok: true,
      database: "connected",
      healthCheckCount: count,
    });
  } catch (error) {
    console.error("DB health check failed:", error);
    return NextResponse.json(
      { ok: false, database: "error", error: String(error) },
      { status: 500 }
    );
  }
}
```

9. Add to Vercel environment variables (Dashboard → Settings → Environment Variables):
   - `DATABASE_URL` = your transaction pooler URL with `?pgbouncer=true`

10. Redeploy:
```bash
npx vercel --prod
```

### CHECKPOINT 2
```
Verify these before proceeding:

□ DATABASE_URL is set in Vercel Dashboard
□ curl https://[YOUR_APP].vercel.app/api/db-health returns {"ok":true,"database":"connected",...}

Type "CHECKPOINT 2 PASSED" to continue.
```

**Wait for user confirmation.**

---

## PHASE 3 — AUTHENTICATION

### Goal
Implement Supabase Auth with minimal UI. Verify protected routes work.

### Steps

1. Get Supabase API keys from **Settings → API**:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (anon public)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role secret)

2. Install Supabase:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

3. Add to `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

4. Create Supabase server client:

**`lib/supabase/server.ts`**
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore in Server Components
          }
        },
      },
    }
  );
}
```

5. Create Supabase browser client:

**`lib/supabase/client.ts`**
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

6. Create auth helper:

**`lib/auth.ts`**
```typescript
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Get current user from cookie session (web)
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Verify Bearer token (mobile)
export async function verifyBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  const token = authHeader.substring(7);
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return { userId: user.id, user };
}

// Unified auth: works for both web (cookies) and mobile (bearer token)
export async function getAuthenticatedUser(request?: Request): Promise<string | null> {
  // Try Bearer token first (mobile)
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const result = await verifyBearerToken(authHeader);
      if (result) return result.userId;
    }
  }
  
  // Fall back to cookie session (web)
  const user = await getCurrentUser();
  return user?.id || null;
}
```

7. Create protected API endpoint:

**`app/api/me/route.ts`**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUser(request);
  
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  return NextResponse.json({ userId });
}
```

8. Create minimal login page:

**`app/auth/login/page.tsx`**
```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setError("Check your email to confirm your account!");
    setIsLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <form onSubmit={handleSignIn} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Sign In</h1>
        
        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Sign In"}
        </button>
        
        <button
          type="button"
          onClick={handleSignUp}
          disabled={isLoading}
          className="w-full p-2 border rounded hover:bg-gray-50"
        >
          Sign Up
        </button>
      </form>
    </main>
  );
}
```

9. Add environment variables to Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

10. Configure Supabase Auth:
    - Go to **Authentication → URL Configuration**
    - Set **Site URL** to your Vercel URL
    - Add redirect URL: `https://[YOUR_APP].vercel.app/**`

11. Redeploy:
```bash
npx vercel --prod
```

### CHECKPOINT 3
```
Verify these before proceeding:

□ Environment variables set in Vercel Dashboard
□ Can sign up with email/password
□ Can sign in after confirming email
□ curl https://[YOUR_APP].vercel.app/api/me (no auth) returns {"error":"Unauthorized"} with status 401
□ API returns userId when authenticated (test in browser console after login)

Type "CHECKPOINT 3 PASSED" to continue.
```

**Wait for user confirmation.**

---

## PHASE 4 — MOBILE APP (Only if selected in Phase 0)

### Goal
Create Expo app that can authenticate and reach the production API.

### Steps

1. Create Expo app (in separate directory):
```bash
npx create-expo-app [APP_NAME]-mobile --template blank-typescript
cd [APP_NAME]-mobile
```

2. Install dependencies:
```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill expo-secure-store
```

3. Create Supabase client:

**`src/lib/supabase.ts`**
```typescript
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

4. Create API helper:

**`src/lib/api.ts`**
```typescript
import { supabase } from "./supabase";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL!;

export async function apiRequest<T>(endpoint: string): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  console.log(`[API] GET ${API_BASE}${endpoint}`);
  
  const response = await fetch(`${API_BASE}${endpoint}`, { headers });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json();
}
```

5. Create simple test app:

**`App.tsx`**
```typescript
import { useState, useEffect } from "react";
import { StyleSheet, Text, View, Button, TextInput, Alert } from "react-native";
import { supabase } from "./src/lib/supabase";
import { apiRequest } from "./src/lib/api";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);
  const [apiResult, setApiResult] = useState<string>("");

  useEffect(() => {
    // Log environment on startup
    console.log("API_BASE:", process.env.EXPO_PUBLIC_API_BASE_URL);
    console.log("SUPABASE_URL:", process.env.EXPO_PUBLIC_SUPABASE_URL);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert("Error", error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const testHealth = async () => {
    try {
      const result = await apiRequest<{ ok: boolean }>("/api/health");
      setApiResult(JSON.stringify(result, null, 2));
    } catch (e: any) {
      setApiResult(`Error: ${e.message}`);
    }
  };

  const testMe = async () => {
    try {
      const result = await apiRequest<{ userId: string }>("/api/me");
      setApiResult(JSON.stringify(result, null, 2));
    } catch (e: any) {
      setApiResult(`Error: ${e.message}`);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sign In</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title="Sign In" onPress={signIn} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Text>User: {user.email}</Text>
      
      <View style={styles.buttons}>
        <Button title="Test /api/health" onPress={testHealth} />
        <Button title="Test /api/me" onPress={testMe} />
        <Button title="Sign Out" onPress={signOut} />
      </View>
      
      {apiResult && (
        <View style={styles.result}>
          <Text style={styles.resultText}>{apiResult}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  buttons: {
    marginTop: 20,
    gap: 10,
  },
  result: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    width: "100%",
  },
  resultText: {
    fontFamily: "monospace",
    fontSize: 12,
  },
});
```

6. Set up EAS:
```bash
npm install -g eas-cli
eas login
eas init
```

7. Create `eas.json`:
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "production": {}
  }
}
```

8. **CRITICAL**: Set EAS secrets BEFORE building:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value https://[YOUR_APP].vercel.app
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://[PROJECT_REF].supabase.co
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJ...
```

9. Build:
```bash
eas build --platform ios --profile preview
```
   - Log in to Apple Developer account when prompted
   - Allow EAS to create credentials

10. Install on device and test

### CHECKPOINT 4
```
Verify these before proceeding:

□ EAS secrets are set (eas secret:list shows all 3)
□ App installs on physical iPhone
□ Console shows correct API_BASE_URL on startup
□ Can sign in with same credentials as web
□ "Test /api/health" button returns {"ok":true,...}
□ "Test /api/me" button returns {"userId":"..."}

Type "CHECKPOINT 4 PASSED" to continue.
```

**Wait for user confirmation.**

---

## PHASE 5 — HARDENING CHECKLIST

Run through this checklist:

```
ENVIRONMENT VARIABLES
□ All Vercel env vars set (DATABASE_URL, SUPABASE_*, etc.)
□ All EAS secrets set (EXPO_PUBLIC_*)
□ No localhost URLs in any production config
□ DATABASE_URL uses pooler (port 6543, ?pgbouncer=true)

SECURITY
□ SUPABASE_SERVICE_ROLE_KEY is NOT in NEXT_PUBLIC_* or EXPO_PUBLIC_*
□ API routes return JSON errors (not HTML redirects)
□ curl /api/me without token returns 401 JSON

MOBILE (if applicable)
□ App logs show correct URLs on startup
□ Rebuilt after every secret change

SUPABASE
□ Site URL set in Auth settings
□ Redirect URLs configured
□ Email templates customized (optional)
```

---

## PHASE 6 — HANDOFF

> ✅ **The app is now safe to build features on.**

You have:
- Working production deployment on Vercel
- Verified database connectivity (Prisma + Supabase)
- Working authentication (web + mobile)
- Mobile app that can reach production API
- All environment variables locked

**Next steps (your choice):**
- Add business logic and data models
- Build out UI
- Add AI features
- Add push notifications
- Add background jobs

---

## TROUBLESHOOTING

### "Network error" on mobile
1. Check EAS secrets are set: `eas secret:list`
2. Rebuild after setting secrets
3. Check device logs for correct API_BASE_URL

### "Unauthorized" when should be authenticated
1. Check Authorization header is being sent
2. Verify token with Supabase directly
3. Check middleware isn't intercepting API routes

### Database connection errors
1. Verify DATABASE_URL uses transaction pooler (port 6543)
2. Include `?pgbouncer=true` in connection string
3. Check Vercel Dashboard has the env var

### Build failures
1. Run `npx expo-doctor` for mobile
2. Check TypeScript errors: `npx tsc --noEmit`
3. Verify all imports resolve correctly

