// app/api/admin/support/route.ts
// Handles: GET  /api/admin/support            → list all conversations
//          GET  /api/admin/support?userId=xxx  → messages for one user
//          POST /api/admin/support             → send admin reply
//          PATCH /api/admin/support            → mark user's messages as read

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

// GET: list conversations OR fetch messages for a specific user
export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  // ── Single user thread ──────────────────────────────────────────────────
  if (userId) {
    const { data, error } = await supabase
      .from("support_messages")
      .select("id, user_id, full_name, email, content, sender, created_at, read_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data });
  }

  // ── Conversation list ───────────────────────────────────────────────────
  // Get the latest message per user with unread count.
  // Uses a raw query for efficiency; falls back to client-side grouping.
  const { data, error } = await supabase
    .from("support_messages")
    .select("user_id, full_name, email, content, sender, created_at, read_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group client-side: one entry per user_id, most recent message first
  const map = new Map<string, {
    user_id: string;
    full_name: string | null;
    email: string | null;
    last_message: string;
    last_message_at: string;
    unread_count: number;
  }>();

  for (const row of data ?? []) {
    if (!map.has(row.user_id)) {
      map.set(row.user_id, {
        user_id:         row.user_id,
        full_name:       row.full_name,
        email:           row.email,
        last_message:    row.content,
        last_message_at: row.created_at,
        unread_count:    0,
      });
    }
    // Count unread user messages (not yet read by admin)
    if (row.sender === "user" && !row.read_at) {
      map.get(row.user_id)!.unread_count += 1;
    }
  }

  const conversations = Array.from(map.values()).sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );

  return NextResponse.json({ conversations });
}

// POST: admin sends a reply
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();
  const { userId, content } = body;

  if (!userId || !content?.trim()) {
    return NextResponse.json({ error: "userId and content are required" }, { status: 400 });
  }

  // Fetch the user's name/email to store alongside the message
  const { data: profile } = await supabase
    .from("support_messages")
    .select("full_name, email")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("support_messages").insert({
    user_id:   userId,
    full_name: profile?.full_name ?? null,
    email:     profile?.email ?? null,
    content:   content.trim(),
    sender:    "admin",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH: mark all unread user messages in a thread as read (admin opened the chat)
export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("support_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("sender", "user")
    .is("read_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}