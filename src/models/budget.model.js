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
    type: String,
    enum: ['USD'],
    default: 'USD'
  },
  dollar_rate_used: {
    type: Number,
    required: true
  },
  total_usd: Number,
  total_ars: Number,
  days_of_stay: Number,
  parts: [
    {
      bikepart_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BikePart' },
      amount: Number
    }
  ],
  services: [
    {
      service_id: { type:mongoose.Schema.Types.ObjectId, ref: 'Service' },
      name: String,
      description: String,
      price_usd: Number
    }
  ],
  client_at_creation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  }
});

export default mongoose.model('Budget', budgetSchema);