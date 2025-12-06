import { config } from "dotenv";
import { defineConfig, type Config } from "drizzle-kit";
import { env } from "./src/env";

config({ path: ".env" });

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./src/drizzle/migrations",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: env.DATABASE_URL,
  },
}) satisfies Config;
