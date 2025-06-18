import BikePart from "../models/bikepart.model.js"

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