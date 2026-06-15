/**
 * Pure authorization rule, isolated from session/DB I/O so it can be unit
 * tested without pulling in `server-only`, BetterAuth, or the database.
 *
 * Returns true only when `email` matches the configured salon owner
 * (case-insensitive). Empty/missing emails are never the owner.
 */
export function isOwnerEmail(
  email: string | null | undefined,
  ownerEmail: string,
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ownerEmail.trim().toLowerCase();
}
