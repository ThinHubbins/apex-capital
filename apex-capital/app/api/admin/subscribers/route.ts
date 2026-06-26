import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminId } from "../../../../lib/supabase/admin-auth";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAdminUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getAdminUser();
  if (!isAdminId(user?.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await service
    .from("email_subscribers")
    .select("id, email, subscribed_at")
    .order("subscribed_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscribers: data });
}

export async function DELETE(req: Request) {
  const user = await getAdminUser();
  if (!isAdminId(user?.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  const { error } = await service.from("email_subscribers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}