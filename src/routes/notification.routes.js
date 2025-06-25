import express from "express";

import {
  getNotificationById,
  getAllNotifications,
  createNotification,
  markAsSeen,
  deleteNotificationById
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get('/', getAllNotifications);
router.get('/:id', getNotificationById);
router.post('/', createNotification);
router.put('/:id/seen', markAsSeen);
router.delete('/:id', deleteNotificationById);

export default router;