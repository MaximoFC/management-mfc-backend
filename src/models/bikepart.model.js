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
    required: true,
    min: 0,
    validate: {
      validator: v => /^\d+(\.\d{1,2})?$/.test(v.toString()), // hasta 2 decimales
      message: props => `${props.value} no es un precio válido (máx. 2 decimales)`
    }
  }
}, { timestamps: true });
export default mongoose.model('BikePart', BikePartSchema);