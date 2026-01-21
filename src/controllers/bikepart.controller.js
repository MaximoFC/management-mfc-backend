import BikePart from "../models/bikepart.model.js";
import Notification from '../models/notification.model.js';

const applyArsPricing = (part, data) => {
  part.cost_ars = data.cost_ars;
  part.markup_percent = data.markup_percent ?? part.markup_percent ?? 45;

  part.sale_price_ars = Math.round(
    part.cost_ars * (1 + part.markup_percent / 100)
  );

  part.pricing_currency = 'ARS';
};

const createLowStockNotification = async (part) => {
  try {
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
  } catch (error) {
    console.error("Error creando notificación de stock bajo:", error.message);
  }
};

export const getBikeParts = async (req, res) => {
  try {
    const { search, type } = req.query;
    const filter = {};

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { brand: regex },
        { description: regex },
        { code: regex }
      ];
    }

    if (type?.trim()) {
      filter.type = type.trim();
    }

    const bikeparts = await BikePart.find(filter).sort({ brand: 1 });

    res.json(
      bikeparts.map(p => ({
        ...p.toObject(),
        price: p.pricing_currency === 'ARS'
          ? p.sale_price_ars
          : p.price_usd,
        currency: p.pricing_currency
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createBikeParts = async (req, res) => {
  try {
    const data = req.body;
    const part = new BikePart();

    part.code = data.code;
    part.brand = data.brand;
    part.type = data.type;
    part.description = data.description;
    part.stock = data.stock ?? 0;

    if (data.cost_ars !== undefined) {
      applyArsPricing(part, data);
    } else if (data.price_usd !== undefined) {
      part.price_usd = data.price_usd;
      part.pricing_currency = 'USD';
    } else {
      throw new Error("Debe especificar precio en ARS o USD");
    }

    await part.save();

    if (part.stock <= 5) {
      await createLowStockNotification(part);
    }

    res.status(201).json(part);
  } catch (err) {
    console.error("Error creando repuesto:", err.message);
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
    const part = await BikePart.findById(req.params.id);
    if (!part) return res.status(404).json({ error: 'No encontrado' });

    const data = req.body;

    part.code = data.code ?? part.code;
    part.brand = data.brand ?? part.brand;
    part.type = data.type ?? part.type;
    part.description = data.description ?? part.description;
    part.stock = data.stock ?? part.stock;

    // ARS tiene prioridad
    if (data.cost_ars !== undefined) {
      applyArsPricing(part, data);
    }

    // USD solo si sigue siendo legacy
    if (
      data.price_usd !== undefined &&
      part.pricing_currency === 'USD' &&
      data.cost_ars === undefined
    ) {
      part.price_usd = data.price_usd;
    }

    await part.save();

    if (part.stock <= 5) {
      await createLowStockNotification(part);
    }

    res.json(part);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteBikePart = async (req, res) => {
  try {
    const part = await BikePart.findByIdAndDelete(req.params.id);
    if (!part) return res.status(404).json({ error: 'No encontrado' });

    await Notification.deleteMany({ bikepart_id: part._id });
    
    res.json({ message: 'Eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}