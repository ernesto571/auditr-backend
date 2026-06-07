import { betterAuth } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { Pool } from "@neondatabase/serverless";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { sql } from "./db.js";

neonConfig.webSocketConstructor = ws;

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const pool = new Pool({
  connectionString: `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require`,
});

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  secondaryStorage: {
    get: async (key) => {
      const [row] = await sql`SELECT value FROM auth_state WHERE key = ${key}`;
      return row?.value ?? null;
    },
    set: async (key, value, ttl) => {
      await sql`
        INSERT INTO auth_state (key, value, expires_at)
        VALUES (${key}, ${value}, ${ttl ? new Date(Date.now() + ttl * 1000) : null})
        ON CONFLICT (key) DO UPDATE SET value = ${value}
      `;
    },
    delete: async (key) => {
      await sql`DELETE FROM auth_state WHERE key = ${key}`;
    },
  },
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3001",
    process.env.CLIENT_URL,
  ].filter(Boolean),
  advanced: {
    useSecureCookies: true,
    crossSubDomainCookies: { enabled: false },
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true,
    },
  },
  emailAndPassword: { enabled: true, minPasswordLength: 8, },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`,
    }
  },
  
  databaseHooks: {
    user: {
      create: {
        after: async (betterAuthUser) => {
          const nameParts = (betterAuthUser.name || "").trim().split(" ");
          const firstName = nameParts[0] || "Unknown";
          const lastName = nameParts.slice(1).join(" ") || "Unknown";
          await sql`
            INSERT INTO users (auth_id, email, first_name, last_name)
            VALUES (${betterAuthUser.id}, ${betterAuthUser.email}, ${firstName}, ${lastName})
            ON CONFLICT (email) DO NOTHING
          `;
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          await sql`
            UPDATE users SET last_login = NOW() WHERE auth_id = ${session.userId}
          `;
        },
      },
    },
  },
});

export const getAuthSession = async (headers) => {
  return await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });
};
