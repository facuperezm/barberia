import { env } from "@/env";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import * as schema from "./schema";

// Configure Neon for WebSocket support in development
if (process.env.NODE_ENV !== "production") {
  // Node has no global WebSocket; the serverless driver needs one.
  neonConfig.webSocketConstructor = ws;

  // When DATABASE_URL points at the local Docker stack (db.localtest.me, see
  // docker-compose.yml), route through the local Neon proxy instead of Neon's
  // cloud endpoint: plain ws, no TLS, no connection pipelining. Pointing at a
  // real Neon branch instead leaves these defaults untouched.
  if (new URL(env.DATABASE_URL).hostname === "db.localtest.me") {
    neonConfig.wsProxy = (host) => `${host}:4444/v2`;
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineConnect = false;
    neonConfig.pipelineTLS = false;
  }
}

// Create a connection pool for better performance
const pool = new Pool({ connectionString: env.DATABASE_URL });

// Initialize Drizzle with the connection pool
export const db = drizzle({ client: pool, schema, logger: false });
