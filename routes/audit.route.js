import express from "express";
import { runAudit } from "../controllers/audit.controller.js";

const router = express.Router();

router.post("/run-audit", runAudit)

export default router;
