import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/verify-email
 * Body: { code: string, mode: "signup" | "login" }
 *
 * MOCK IMPLEMENTATION.
 * Replace this with a real check against the code you generated and
 * stored (e.g. in your DB or a short-lived cache) when the code was sent.
 *
 * For local testing, the demo code is "123456".
 */

const DEMO_VALID_CODE = "123456";

export async function POST(req: NextRequest) {
  let body: { code?: string; mode?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { code, mode } = body;

  if (!code || code.length !== 6) {
    return NextResponse.json(
      { success: false, error: "Enter the full 6-digit code." },
      { status: 400 }
    );
  }

  // --- Replace with real lookup -------------------------------------
  // const record = await db.verificationCodes.findOne({ userId, mode });
  // const isValid = record && record.code === code && record.expiresAt > Date.now();
  const isValid = code === DEMO_VALID_CODE;
  // --------------------------------------------------------------------

  if (!isValid) {
    return NextResponse.json(
      { success: false, error: "That code is incorrect or has expired." },
      { status: 401 }
    );
  }

  // TODO: mark email_verified = true (signup) or mark this session/device
  // as trusted (login 2FA), then issue/refresh the session token.

  return NextResponse.json({ success: true, mode });
}