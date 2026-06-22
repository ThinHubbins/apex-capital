import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// While testing, "onboarding@resend.dev" works without a verified
// domain but only delivers to your own Resend account email. Swap
// in your real "from" address once you've verified a domain in
// Resend's dashboard.
const FROM_ADDRESS = process.env.OTP_FROM_EMAIL || "onboarding@resend.dev";

export async function sendOtpEmail(to: string, code: string) {
  const { error } = await resend.emails.send({
    from: `Apex Capital <${FROM_ADDRESS}>`,
    to,
    subject: `${code} is your verification code`,
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
        <h2 style="color: #111827;">Confirm your email</h2>
        <p style="color: #6B7280; font-size: 14px;">
          Enter this code to verify your email address. It expires in 10 minutes.
        </p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #111827;">
          ${code}
        </p>
        <p style="color: #9CA3AF; font-size: 12px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Failed to send OTP email");
  }
}