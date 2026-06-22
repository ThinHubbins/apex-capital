import { createAdminClient } from "./supabase/admin";

type NotificationType = "kyc_status" | "general";

type CreateNotificationInput = {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
};

/**
 * Creates a notification for a user. Call this from server-side code
 * (API routes, server actions) any time an admin action changes
 * something the user should know about.
 */
export async function createNotification({
  userId,
  type = "general",
  title,
  message,
  link,
}: CreateNotificationInput) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    link: link ?? null,
  });

  if (error) {
    // Don't throw — a failed notification shouldn't roll back the
    // underlying action (e.g. a KYC approval) that already succeeded.
    console.error("Failed to create notification:", error);
  }
}