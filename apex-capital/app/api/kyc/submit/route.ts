import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { personalInfo, docType, frontPath, backPath, selfiePath } = body;

  // Images were already uploaded directly to Storage from the browser
  // (using the user's own session) — this route just persists the
  // resulting paths plus the form fields. No storage calls happen here.

  // Don't let a missing path in THIS request overwrite a path that was
  // already saved from a previous successful submission for this user.
  const { data: existing } = await supabase
    .from("kyc_submissions")
    .select("front_image_url, back_image_url, selfie_url")
    .eq("user_id", user.id)
    .maybeSingle();

  const finalFrontPath = frontPath ?? existing?.front_image_url ?? null;
  const finalBackPath = backPath ?? existing?.back_image_url ?? null;
  const finalSelfiePath = selfiePath ?? existing?.selfie_url ?? null;

  const { error } = await supabase.from("kyc_submissions").upsert({
    user_id: user.id,
    full_name: personalInfo.fullName,
    date_of_birth: personalInfo.dateOfBirth,
    nationality: personalInfo.nationality,
    residential_address: personalInfo.residentialAddress,
    city: personalInfo.city,
    country: personalInfo.country,
    postal_code: personalInfo.postalCode,
    doc_type: docType,
    front_image_url: finalFrontPath,
    back_image_url: finalBackPath,
    selfie_url: finalSelfiePath,
    has_front_image: !!finalFrontPath,
    has_back_image: !!finalBackPath,
    has_selfie: !!finalSelfiePath,
    status: "pending",
    submitted_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("profiles").update({ kyc_status: "pending" }).eq("id", user.id);

  return NextResponse.json({ success: true });
}