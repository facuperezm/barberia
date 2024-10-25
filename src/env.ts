import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string(), // Add JWT_SECRET
  },
  client: {
    NEXT_PUBLIC_RESEND_API_KEY: z.string(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_RESEND_API_KEY: process.env.NEXT_PUBLIC_RESEND_API_KEY,
  },
});
