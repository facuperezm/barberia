import { config } from "dotenv";
import { defineConfig, type Config } from "drizzle-kit";

config({ path: ".env" });

export default defineConfig({
  schema: "./src/drizzle/schema.ts",
  out: "./src/drizzle/migrations",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
}) satisfies Config;
