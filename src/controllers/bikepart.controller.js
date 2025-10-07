import BikePart from "../models/bikepart.model.js";
import Notification from '../models/notification.model.js';

const createLowStockNotification = async (part) => {
  const exists = await Notification.findOne({
    type: "alert",
    bikepart_id: part._id,
    read: false
  });

  if (!exists) {
    await Notification.create({
      type: "alert",
      bikepart_id: part._id,
      message_body: `Stock bajo: ${part.brand} ${part.description} (${part.stock} unidad/es)`,
      read: false
    });
  }
};

export const getBikeParts = async (req, res) => {
  try {
    const bikeparts = await BikePart.find();
    res.json(bikeparts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createBikeParts = async (req, res) => {
  try {
    const part = new BikePart(req.body);
    await part.save();

    if (part.stock <= 5) {
      await Notification.create({
        type: "alert",
        message_body: `Stock bajo: ${part.brand} ${part.description} (${part.stock} unidad/es)`
      });
    }

    res.status(201).json(part);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export const getBikePartById = async (req, res) => {
  try {
    const part = await BikePart.findById(req.params.id);
    if (!part) return res.status(404).json({ error: 'No encontrado' });
    res.json(part);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const updateBikePart = async (req, res) => {
  try {
    const part = await BikePart.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!part) return res.status(404).json({ error: 'No encontrado' });

    if (part.stock <= 5) {
      const existing = await Notification.findOne({
        type: 'alert',
        message_body: { $regex: part.description, $options: 'i' },
        seen: false,
      });

      if (!existing) {
        await Notification.create({
          type: "alert",
          message_body: `Stock bajo: ${part.brand} ${part.description} (${part.stock} unidad/es)`
        })
      }
    }

    res.json(part);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export const deleteBikePart = async (req, res) => {
  try {
    const part = await BikePart.findByIdAndDelete(req.params.id);
    if (!part) return res.status(404).json({ error: 'No encontrado' });
    res.json({ message: 'Eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}