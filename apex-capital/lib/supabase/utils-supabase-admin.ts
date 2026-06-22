import { createClient } from "@supabase/supabase-js";

// Server-only. Uses the service role key, which bypasses RLS —
// never import this file from a "use client" component, and
// never expose SUPABASE_SERVICE_ROLE_KEY to the browser bundle.
// It should only have the NEXT_PUBLIC_ prefix removed, i.e. set
// as a plain (non-public) env var in .env.local / your host.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}