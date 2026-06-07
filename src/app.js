import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../config/auth.js";
import userRoutes from "../routes/user.route.js";
import auditRoutes from "../routes/audit.route.js";
import reportRoutes from "../routes/report.route.js";
import "dotenv/config";

const app = express();
app.set("trust proxy", 1);

app.use(cors({
  origin: [process.env.CLIENT_URL, "http://localhost:5173", process.env.BETTER_AUTH_URL],
  credentials: true,
}));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev"));

// Better Auth FIRST — before anything else touches /api/auth
app.all(/^\/api\/auth\/.*/, toNodeHandler(auth));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

app.use("/api/user", userRoutes);
app.use("/api", auditRoutes);
app.use("/api/reports", reportRoutes);

export default app;