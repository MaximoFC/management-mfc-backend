import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price_ars: {
    type: Number,
    min: 0
  },
  // Legacy: precio anterior en USD, solo se conserva como referencia
  price_usd: Number
}, {
  timestamps: true
});

export default mongoose.model('Service', serviceSchema);