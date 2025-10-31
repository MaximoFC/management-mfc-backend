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
  price_usd: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: v => /^\d+(\.\d{1,2})?$/.test(v.toString()), // hasta 2 decimales
      message: props => `${props.value} no es un precio válido (máx. 2 decimales)`
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Service', serviceSchema);