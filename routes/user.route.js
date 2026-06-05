import express from "express";
import { deleteAccount, getProfile, updateProfile } from "../controllers/user.controller.js";
import  requireAuth  from "../middlewares/requireAuth.js"

const router = express.Router();

router.use(requireAuth)

router.get("/profile", getProfile);
router.patch("/profile/:id", updateProfile);
router.delete("/delete", deleteAccount)

export default router;