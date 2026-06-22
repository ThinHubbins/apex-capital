import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "./utils-supabase-admin";
import { verifyOtpHash, MAX_ATTEMPTS } from "../supabase/lib-otp";

export async function POST(req: NextRequest) {
  const { email, code, purpose = "signup" } = await req.json();

  if (!email || !code) {
    return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: otpRow, error: fetchError } = await supabase
    .from("otp_codes")
    .select("id, code_hash, attempts, max_attempts, expires_at, consumed_at")
    .eq("email", email)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !otpRow) {
    return NextResponse.json({ error: "No code found. Request a new one." }, { status: 400 });
  }

  if (otpRow.consumed_at) {
    return NextResponse.json(
      { error: "This code has already been used. Request a new one." },
      { status: 400 }
    );
  }

  if (new Date(otpRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "This code has expired. Request a new one." },
      { status: 400 }
    );
  }

  if (otpRow.attempts >= (otpRow.max_attempts ?? MAX_ATTEMPTS)) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Request a new code." },
      { status: 429 }
    );
  }

  const isValid = verifyOtpHash(code, otpRow.code_hash);

  if (!isValid) {
    await supabase
      .from("otp_codes")
      .update({ attempts: otpRow.attempts + 1 })
      .eq("id", otpRow.id);

    return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 400 });
  }

  // Success: mark the code consumed and flip the profile's
  // email_verified flag. profiles.email is kept in sync by the
  // handle_new_user trigger, so this is a plain lookup.
  await supabase.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ email_verified: true })
    .eq("email", email);

  if (profileError) {
    return NextResponse.json(
      { error: "Code verified, but couldn't update your profile. Contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}