import mongoose from "mongoose";

const BikePartSchema = new mongoose.Schema({
  code: { 
    type: String,
    required: true 
  },
  brand: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String 
  },
  description: { 
    type: String 
  },
  stock: { 
    type: Number, 
    required: true, 
    default: 0 
  },
  price_usd: { 
    type: Number, 
    required: true 
  }
}, { timestamps: true });
export default mongoose.model('BikePart', BikePartSchema);
