import { env } from "@/env";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import * as schema from "./schema";

// Configure Neon for WebSocket support in development
if (process.env.NODE_ENV !== "production") {
  neonConfig.webSocketConstructor = ws;
}

// Create a connection pool for better performance
const pool = new Pool({ connectionString: env.DATABASE_URL });

// Initialize Drizzle with the connection pool
export const db = drizzle({ client: pool, schema, logger: false });
