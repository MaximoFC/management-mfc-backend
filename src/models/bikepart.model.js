import mongoose from "mongoose";

const BikePartSchema = new mongoose.Schema({
  code: { 
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  brand: { 
    type: String, 
    required: true,
    trim: true
  },
  type: { 
    type: String,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  stock: { 
    type: Number, 
    required: true, 
    default: 0,
    min: 0
  },

  // Legacy
  price_usd: {
    type: Number,
    min: 0
  },

  // Modelo nuevo
  cost_ars: {
    type: Number,
    min: 0
  },
  markup_percent: {
    type: Number,
    default: 45,
    min: 0
  },
  sale_price_ars: {
    type: Number,
    min: 0
  },
  pricing_currency: {
    type: String,
    enum: ['USD', 'ARS'],
    default: 'USD'
  },
    is_legacy_pricing: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

BikePartSchema.pre('save', function (next) {
  if (this.pricing_currency === 'ARS' && this.sale_price_ars == null) {
    return next(new Error("Repuesto en ARS sin precio de venta"));
  }
  next();
});

export default mongoose.model('BikePart', BikePartSchema);