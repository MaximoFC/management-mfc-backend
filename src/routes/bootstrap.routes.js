import express from "express";
import { getBootstrapData } from "../controllers/bootstrap.controller.js";
import { tokenVerify } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", tokenVerify, getBootstrapData);

export default router;