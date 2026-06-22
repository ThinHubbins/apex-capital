import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Use this in Server Components, Route Handlers (app/api/.../route.ts),
 * and Server Actions — anywhere you need the user's session on the
 * server, e.g. reading KYC status to render the dashboard, or gating
 * a route before it even renders.
 */
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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions (see middleware.ts below).
          }
        },
      },
    }
  );
}