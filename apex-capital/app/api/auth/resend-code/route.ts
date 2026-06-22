import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/resend-code
 * Body: { mode: "signup" | "login" }
 *
 * MOCK IMPLEMENTATION.
 * Replace with real logic that:
 *   1. Generates a new 6-digit code
 *   2. Stores it with an expiry (e.g. 10 minutes)
 *   3. Sends it to the user's email via your email provider (e.g. Resend, SES, Postmark)
 */

export async function POST(req: NextRequest) {
  let body: { mode?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { mode } = body;

  // TODO:
  // const code = generateSixDigitCode();
  // await saveVerificationCode({ userId, code, mode, expiresInMinutes: 10 });
  // await sendEmail({ to: user.email, template: "verification-code", code });

  return NextResponse.json({ success: true, mode });
}