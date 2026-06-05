import express from "express";
import requireAuth from "../middlewares/requireAuth.js";
import { getAllReports, getSavedReports, removeFromSavedReport, saveReport } from "../controllers/reports.controller.js";

const router = express.Router(requireAuth);

router.patch("/:id/save", saveReport)
router.patch("/:id/unsave", removeFromSavedReport)

router.get("/", getAllReports)
router.get("/saved", getSavedReports)

export default router;