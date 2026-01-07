import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Get the current user from the session (for server components and API routes)
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  return user.id;
}

/**
 * Verify a bearer token from mobile app (Supabase JWT)
 */
export async function verifyBearerToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  
  // Verify the JWT with Supabase
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }
  
  return { userId: user.id, user };
}

/**
 * Get user from either session (web) or bearer token (mobile)
 */
export async function getAuthenticatedUser(request?: Request) {
  // Try bearer token first (mobile)
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const result = await verifyBearerToken(authHeader);
      if (result) return result.userId;
    }
  }
  
  // Fall back to session (web)
  const user = await getCurrentUser();
  return user?.id || null;
}
