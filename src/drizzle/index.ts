import { env } from "@/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export const connection = postgres(
  env.NEXT_PUBLIC_NODE_ENV === "development"
    ? env.DATABASE_URL_DEV
    : env.DATABASE_URL,
);
export const db = drizzle(connection, {
  schema,
  logger: true,
});
