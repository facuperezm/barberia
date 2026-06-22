export const DEV_TEST_EMAIL = "owner@test.local";

/** Dev sign-in is only ever available outside production. */
export const isDevAuthEnabled = process.env.NODE_ENV !== "production";

// Single-slot capture of the magic-link token for the test account so the dev
// sign-in action can verify it without an email round-trip.
let captured: string | null = null;
export function captureDevMagicToken(token: string): void {
  captured = token;
}
export function takeDevMagicToken(): string | null {
  const token = captured;
  captured = null;
  return token;
}
