import { createAdminClient } from "./supabase/admin";

export async function createNotification({
  userId,
  type = "general",
  title,
  message,
  link,
}: {
  userId: string;
  type?: string;
  title: string;
  message: string;
  link?: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    link: link ?? null,
  });
  if (error) console.error("Failed to create notification:", error);
}