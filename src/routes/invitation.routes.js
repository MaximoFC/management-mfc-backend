import express from "express";
import { createInvitation } from "../controllers/invitation.controller.js";
import { tokenVerify, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/invite", tokenVerify, isAdmin, createInvitation);

export default router;