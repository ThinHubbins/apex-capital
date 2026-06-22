import crypto from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;

/** Generates a cryptographically random 6-digit code, e.g. "042817". */
export function generateOtp(): string {
  // randomInt is rejection-sampled, so this is unbiased (unlike % 1000000).
  const n = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return n.toString().padStart(OTP_LENGTH, "0");
}

/** One-way hash so the raw code is never stored at rest. */
export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/** Constant-time comparison to avoid timing attacks on the hash check. */
export function verifyOtpHash(code: string, hash: string): boolean {
  const candidate = Buffer.from(hashOtp(code));
  const expected = Buffer.from(hash);
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}