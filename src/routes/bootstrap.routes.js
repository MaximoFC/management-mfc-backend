import express from "express";
import { getDashboardSummary } from "../controllers/bootstrap.controller.js";
import { tokenVerify } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/dashboard", tokenVerify, getDashboardSummary);

export default router;