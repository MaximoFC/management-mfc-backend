import BikePart from "../models/bikepart.model.js";
import Notification from '../models/notification.model.js';
import XLSX from "xlsx";

// Helpers

const applyArsPricing = (part, data) => {
  part.cost_ars = data.cost_ars;
  part.markup_percent = data.markup_percent ?? part.markup_percent ?? 45;

  part.sale_price_ars = Math.round(
    part.cost_ars * (1 + part.markup_percent / 100)
  );

  part.pricing_currency = 'ARS';
  part.is_legacy_pricing = false;
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

// Get 

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

export const getBikePartById = async (req, res) => {
  try {
    const part = await BikePart.findById(req.params.id);
    if (!part) return res.status(404).json({ error: 'No encontrado' });
    res.json(part);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create

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
      part.is_legacy_pricing = true;
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
};

// Update

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

export const updateBikePartPartial = async (req, res) => {
  try {
    const part = await BikePart.findById(req.params.id);
    if (!part) return res.status(404).json({ error: "No encontrado" });

    const data = req.body;

    if (data.brand !== undefined) part.brand = data.brand;
    if (data.type !== undefined) part.type = data.type;
    if (data.description !== undefined) part.description = data.description;

    if (data.cost_ars !== undefined) {
      applyArsPricing(part, data);
    }

    await part.save();
    res.json(part);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateBikePartStock = async (req, res) => {
  try {
    const { delta } = req.body;

    if (typeof delta !== "number") {
      return res.status(400).json({ error: "Delta inválido" });
    }

    const part = await BikePart.findById(req.params.id);
    if (!part) return res.status(404).json({ error: "No encontrado" });

    part.stock += delta;
    await part.save();
    await createLowStockNotification(part);

    res.json(part);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete

export const deleteBikePart = async (req, res) => {
  try {
    const part = await BikePart.findByIdAndDelete(req.params.id);
    if (!part) return res.status(404).json({ error: 'No encontrado' });

    await Notification.deleteMany({ bikepart_id: part._id });
    
    res.json({ message: 'Eliminado con éxito' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Import

export const updateBikePartsPricesFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No se subió ningún archivo" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: "A" });

    const result = {
      updated: 0,
      skipped: 0,
      notFounr: []
    };

    for (const row of rows) {
      const code = String(row.A || "").trim();
      const priceList = Number(row.E);

      if (!code || !priceList || priceList <= 0) {
        result.skipped++;
        continue;
      }

      const part = await BikePart.findOne({ code });

      if (!part) {
        result.notFound.push(code);
        continue;
      }

      const markup = 45;
      const salePrice = Math.round(priceList * (1 + markup / 100));

      part.pricing_currency = "ARS";
      part.sale_price_ars = salePrice;
      part.markup_percent = markup;
      part.is_legacy_pricing = false;

      await part.save();
      result.updated++;
    }

    res.json({
      message: "Actualización de precios finales",
      result
    });
  } catch (err) {
    console.error("Excel price update error: ", err);
    res.status(500).json({ message: err.message });
  }
};