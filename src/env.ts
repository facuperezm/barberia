import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    CLERK_SECRET_KEY: z.string(),
    OWNER_EMAIL: z.string(),
    // MercadoPago Server Variables
    MERCADOPAGO_ACCESS_TOKEN: z.string(),
    MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_RESEND_API_KEY: z.string(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
    // MercadoPago Client Variables
    NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: z.string(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_RESEND_API_KEY: process.env.NEXT_PUBLIC_RESEND_API_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
  },
});
