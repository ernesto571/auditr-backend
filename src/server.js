import { sql } from "../config/db.js";
import app from "./app.js";
import "dotenv/config";

const PORT = process.env.PORT || 5000;

async function initDB() {
  console.log("🔄 Initializing database...");
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
        image TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log("✅ Better Auth user table ready");

    await sql`
      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      )
    `;
    console.log("✅ Better Auth session table ready");

    await sql`
      CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP,
        "refreshTokenExpiresAt" TIMESTAMP,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log("✅ Better Auth account table ready");

    await sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log("✅ Better Auth verification table ready");
 
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        auth_id TEXT UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `;
    console.log("✅ Users table ready");

    // reports table

    await sql`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        auth_id TEXT NOT NULL REFERENCES users(auth_id) ON DELETE CASCADE,
        domain TEXT NOT NULL,
        url TEXT NOT NULL,
        overall_score NUMERIC(4,1) NOT NULL,
        verdict TEXT,
        scores JSONB DEFAULT '{}',
        summary TEXT NOT NULL,
        headline TEXT NOT NULL,
        findings JSONB DEFAULT '[]',
        strengths TEXT[],
        quick_wins TEXT[],
        ui_ux_notes JSONB DEFAULT '{}',
        conversion_notes JSONB DEFAULT '{}',
        key_insight TEXT NOT NULL,
        priority_order TEXT[],
        scan_meta JSONB DEFAULT '{}',
        screenshot_url TEXT,
        saved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log("✅ reports table ready");


  } catch (error) {
    console.error("❌ Error initDB:", error);
    process.exit(1);
  }
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
});