export const ADMIN_IDS = ["05d8eb0d-3aa7-404f-ade1-27fe6af3e1bc"];

export function isAdminId(userId: string | undefined | null): boolean {
  return !!userId && ADMIN_IDS.includes(userId);
}