import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoSignature } from "@/server/payments/webhook-signature";

const SECRET = "test-secret";

function sign(manifest: string, secret = SECRET): string {
  return crypto.createHmac("sha256", secret).update(manifest).digest("hex");
}

function makeHeader(dataId: string, requestId: string, ts: number): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return `ts=${ts},v1=${sign(manifest)}`;
}

describe("verifyMercadoPagoSignature", () => {
  const nowMs = 1_750_000_000_000;

  it("accepts a valid signature", () => {
    const ts = Math.floor(nowMs / 1000);
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: makeHeader("12345", "req-1", ts),
        requestId: "req-1",
        dataId: "12345",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(true);
  });

  it("rejects a missing header", () => {
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: null,
        requestId: "req-1",
        dataId: "12345",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it("rejects a tampered data id", () => {
    const ts = Math.floor(nowMs / 1000);
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: makeHeader("12345", "req-1", ts),
        requestId: "req-1",
        dataId: "99999",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const ts = Math.floor(nowMs / 1000);
    const manifest = `id:12345;request-id:req-1;ts:${ts};`;
    const header = `ts=${ts},v1=${sign(manifest, "other-secret")}`;
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: header,
        requestId: "req-1",
        dataId: "12345",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it("rejects a stale timestamp (replay)", () => {
    const staleTs = Math.floor(nowMs / 1000) - 10 * 60; // 10 minutes old
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: makeHeader("12345", "req-1", staleTs),
        requestId: "req-1",
        dataId: "12345",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(false);
  });

  it("uppercase data ids are lowercased per MP spec", () => {
    const ts = Math.floor(nowMs / 1000);
    expect(
      verifyMercadoPagoSignature({
        signatureHeader: makeHeader("abc123", "req-1", ts),
        requestId: "req-1",
        dataId: "ABC123",
        secret: SECRET,
        nowMs,
      }),
    ).toBe(true);
  });
});
