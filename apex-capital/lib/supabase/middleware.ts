import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminId } from "./admin-auth";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ---- Admin protection ----
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!isAdminId(user?.id)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // ---- Route protection ----
  const protectedPaths = [
    "/dashboard",
    "/portfolio",
    "/wallet",
    "/profile",
    "/kyc-flow",
    "/sessions",      // <-- new
    "/two-factor",    // <-- new
  ];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // ---- AAL2 enforcement (MFA) ----
  // Only runs for authenticated users on protected routes.
  // If the user has enrolled TOTP but their current session is still AAL1,
  // bounce them to /mfa-challenge to complete the second factor.
  // /two-factor and /mfa-challenge are exempt so they don't redirect-loop.
  if (user && isProtected) {
    const isMfaSetupOrChallenge =
      request.nextUrl.pathname.startsWith("/two-factor") ||
      request.nextUrl.pathname.startsWith("/mfa-challenge");

    if (!isMfaSetupOrChallenge) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa-challenge";
        url.searchParams.set("redirect", request.nextUrl.pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}