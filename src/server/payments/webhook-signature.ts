import crypto from "node:crypto";

const DEFAULT_TOLERANCE_MS = 5 * 60 * 1000;

interface VerifyArgs {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
  nowMs?: number;
  toleranceMs?: number;
}

/**
 * Verify MercadoPago's x-signature header.
 * Spec: manifest is `id:{data.id};request-id:{x-request-id};ts:{ts};`
 * where data.id is lowercased and segments with missing values are omitted.
 * https://www.mercadopago.com/developers/en/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoSignature({
  signatureHeader,
  requestId,
  dataId,
  secret,
  nowMs = Date.now(),
  toleranceMs = DEFAULT_TOLERANCE_MS,
}: VerifyArgs): boolean {
  if (!signatureHeader || !secret) return false;

  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=");
    if (key?.trim() === "ts") ts = value?.trim() ?? null;
    if (key?.trim() === "v1") v1 = value?.trim() ?? null;
  }

  if (!ts || !v1) return false;

  const tsMs = Number(ts) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(nowMs - tsMs) > toleranceMs) {
    return false;
  }

  const segments: string[] = [];
  if (dataId) segments.push(`id:${dataId.toLowerCase()}`);
  if (requestId) segments.push(`request-id:${requestId}`);
  segments.push(`ts:${ts}`);
  const manifest = segments.join(";") + ";";

  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(v1, "hex");

  if (
    providedBuffer.length === 0 ||
    expectedBuffer.length !== providedBuffer.length
  ) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
