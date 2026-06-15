import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    // BetterAuth: 32+ char secret used to sign/encrypt sessions & tokens.
    BETTER_AUTH_SECRET: z.string().min(32),
    OWNER_EMAIL: z.string(),
    // MercadoPago Server Variables
    MERCADOPAGO_ACCESS_TOKEN: z.string(),
    MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1),
    // Email Server Variable (server-only for security)
    RESEND_API_KEY: z.string(),
  },
  client: {
    // MercadoPago Client Variables
    NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: z.string(),
    // Also the BetterAuth base URL (origin for magic-link callbacks).
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
