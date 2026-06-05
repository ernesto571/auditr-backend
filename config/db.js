import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

console.log("🔗 Database config:", {
  host: PGHOST,
  database: PGDATABASE,
  user: PGUSER,
  hasPassword: !!PGPASSWORD
});

// creates a SQL connection using our env variables
export const sql = neon(
  `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require`
);

console.log("✅ Neon SQL client initialized");