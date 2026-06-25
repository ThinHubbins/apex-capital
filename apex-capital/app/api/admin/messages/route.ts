import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { createNotification } from "../../../../lib/notifications";

const ADMIN_IDS = ["05d8eb0d-3aa7-404f-ade1-27fe6af3e1bc"];

async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && ADMIN_IDS.includes(user.id);
}

// GET /api/admin/messages — returns all users (id + name + email) for the picker.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: data ?? [] });
}

// POST /api/admin/messages — send a notification to one user or all users.
// Body: { target: "user" | "all", userId?: string, title: string, message: string }
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { target, userId, title, message } = await req.json();

  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
  }

  if (target === "user") {
    if (!userId) {
      return NextResponse.json({ error: "userId is required for single-user messages." }, { status: 400 });
    }

    await createNotification({
      userId,
      type: "admin_message",
      title: title.trim(),
      message: message.trim(),
    });

    return NextResponse.json({ success: true, sent: 1 });
  }

  if (target === "all") {
    const admin = createAdminClient();

    const { data, error } = await admin.from("profiles").select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const ids: string[] = (data ?? []).map((r: { id: string }) => r.id);

    // Batch insert — one DB call regardless of user count.
    const rows = ids.map((uid) => ({
      user_id: uid,
      type: "admin_message",
      title: title.trim(),
      message: message.trim(),
      link: null,
      read: false,
    }));

    const { error: insertError } = await admin.from("notifications").insert(rows);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ success: true, sent: ids.length });
  }

  return NextResponse.json({ error: "Invalid target. Use 'user' or 'all'." }, { status: 400 });
}