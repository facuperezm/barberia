import { env } from "@/env";
import { defineConfig, type Config } from "drizzle-kit";

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./src/drizzle/migrations",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    url:
      env.NEXT_PUBLIC_NODE_ENV === "dev"
        ? env.DATABASE_URL_DEV
        : env.DATABASE_URL,
  },
}) satisfies Config;
