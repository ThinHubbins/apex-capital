import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createNotification } from "../../../../lib/notifications";
import { isAdminId } from "../../../../lib/supabase/admin-auth";

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminId(user?.id);

}
// front/back live in "kyc-documents", selfie lives in "kyc-selfies" —
// matches the buckets used in /api/kyc/submit's uploadImage().
async function signPath(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 300); // 5 min
  if (error || !data) {
    console.error(`Failed to sign ${bucket}/${path}:`, error);
    return null;
  }
  return data.signedUrl;
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("kyc_submissions")
    .select("*")
    .eq("status", status)
    .order("submitted_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The DB stores storage PATHS (e.g. "user-id/front.jpg"), not URLs.
  // Sign each one into a temporary viewable URL before sending to the client —
  // these buckets are private, so a raw path/public-style URL won't render.
  const submissions = await Promise.all(
    (data ?? []).map(async (sub) => ({
      ...sub,
      front_image_url: await signPath(admin, "kyc-documents", sub.front_image_url),
      back_image_url: await signPath(admin, "kyc-documents", sub.back_image_url),
      selfie_url: await signPath(admin, "kyc-selfies", sub.selfie_url),
    }))
  );

  return NextResponse.json({ submissions });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, action, rejectionReason } = await req.json();
  const newStatus = action === "approve" ? "verified" : "rejected";
  const admin = createAdminClient();

  const { error: subError } = await admin
    .from("kyc_submissions")
    .update({
      status: newStatus,
      rejection_reason: rejectionReason ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 });

  const { error: profileError } = await admin
    .from("profiles")
    .update({ kyc_status: newStatus })
    .eq("id", userId);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  // Let the user know — shows up in their navbar bell.
  await createNotification({
    userId,
    type: "kyc_status",
    title: newStatus === "verified" ? "Identity verified" : "Verification rejected",
    message:
      newStatus === "verified"
        ? "Your identity verification was approved. You now have full access to your account."
        : `Your identity verification was rejected: ${rejectionReason ?? "Please review and resubmit."}`,
    link: "/profile",
  });

  return NextResponse.json({ success: true });
}