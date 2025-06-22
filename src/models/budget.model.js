import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema({
  bike_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bike', 
    required: true 
  },
  employee_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee', 
    required: true 
  },
  state: {
    type: String,
    enum: ['iniciado', 'en proceso', 'terminado', 'pagado', 'retirado'],
    default: 'iniciado'
  },
  creation_date: { 
    type: Date, 
    default: Date.now 
  },
  payment_date: Date,
  currency: { 
    type: String, enum: ['USD', 'ARS'], 
    default: 'USD' },
  total_usd: Number,
  total_ars: Number,
  days_of_stay: Number,
  parts: [
    {
      bikepart_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BikePart' },
      amount: Number
    }
  ]
});

export default mongoose.model('Budget', budgetSchema);