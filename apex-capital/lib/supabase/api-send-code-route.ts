import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "./utils-supabase-admin";
import { generateOtp, hashOtp, OTP_TTL_MINUTES } from "../supabase/lib-otp";
import { sendOtpEmail } from "../supabase/lib-emails";

const RESEND_COOLDOWN_SECONDS = 30;

export async function POST(req: NextRequest) {
  const { email, purpose = "signup" } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Basic server-side rate limit: don't let someone spam-request
  // codes faster than the UI's own resend cooldown.
  const { data: recent } = await supabase
    .from("otp_codes")
    .select("created_at")
    .eq("email", email)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    const secondsSince = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
    if (secondsSince < RESEND_COOLDOWN_SECONDS) {
      return NextResponse.json(
        { error: `Please wait before requesting another code.` },
        { status: 429 }
      );
    }
  }

  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from("otp_codes").insert({
    email,
    purpose,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json({ error: "Couldn't create a code. Try again." }, { status: 500 });
  }

  try {
    await sendOtpEmail(email, code);
  } catch {
    return NextResponse.json({ error: "Couldn't send the email. Try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}