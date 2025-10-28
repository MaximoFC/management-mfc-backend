import Notification from "../models/notification.model.js";

export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: 'ID inválido o error al buscar la notificación' });
  }
};

export const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ creation_date: -1 }).lean();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

export const createNotification = async (req, res) => {
  try {
    const { type, message_body } = req.body;

    if (!["alert", "reminder"].includes(type)) {
      return res.status(400).json({ error: "Invalid notification type" });
    }

    const notification = new Notification({ type, message_body });
    await notification.save();

    res.status(201).json(notification);
  } catch (err) {
    res.status(400).json({ error: 'Error al crear notificación' });
  }
};

export const markAsSeen = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { seen: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json(notification);
  } catch (err) {
    res.status(400).json({ error: 'Error al actualizar notificación' });
  }
};

export const deleteNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedNotification = await Notification.findByIdAndDelete(id);

    if (!deletedNotification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json({ message: 'Notificación eliminada correctamente' });
  } catch (err) {
    res.status(400).json({ error: 'Error al eliminar notificación' });
  }
};