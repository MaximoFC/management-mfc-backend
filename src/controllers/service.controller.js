import Service from '../models/service.model.js';

export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 }).lean();
    res.json(services);
  } catch (err) {
    console.error("Error retrieving services: ", err.message);
    res.status(500).json({ error: 'Error retrieving services' });
  }
};

export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    console.error("Error getting service by ID:", err.message);
    res.status(400).json({ error: 'Invalid ID' });
  }
};

export const createService = async (req, res) => {
  try {
    const { name, description, price_usd } = req.body;
    const newService = new Service({ name, description, price_usd });
    await newService.save();
    res.status(201).json(newService);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const updateService = async (req, res) => {
  try {
    const { name, description, price_usd } = req.body;

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { name, description, price_usd },
      { new: true, runValidators: true }
    );

    if (!updatedService) return res.status(404).json({ error: 'Service not found' });

    res.json(updatedService);
  } catch (err) {
    console.error("Error updating service:", err.message);
    res.status(400).json({ error: err.message });
  }
};

export const deleteService = async (req, res) => {
  try {
    const deleted = await Service.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Service not found' });

    res.status(204).send();
  } catch (err) {
    console.error("Error deleting service:", err.message);
    res.status(400).json({ error: 'Invalid ID' });
  }
};