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
  price_usd: { 
    type: Number, 
    required: true 
  }
}, { timestamps: true });
export default mongoose.model('BikePart', BikePartSchema);