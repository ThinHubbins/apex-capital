import { createBrowserClient } from "@supabase/ssr";

/**
 * Use this in "use client" components — e.g. login forms, the
 * create-account form, profile settings, anywhere you call
 * supabase.auth.* or run a query directly from the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}