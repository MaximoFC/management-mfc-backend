import mongoose from "mongoose";

const warrantySchema = new mongoose.Schema({
  hasWarranty: { type: Boolean, default: false },
  startDate: Date,
  endDate: Date,
  checkups: [
    {
      date: Date,
      notified: { type: Boolean, default: false },
      completed: { type: Boolean, default: false }
    }
  ],
  status: {
    type: String,
    enum: ['activa', 'expirada', 'anulada'],
    default: 'activa'
  }
}, { _id: false });

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
    enum: ['USD', 'ARS'],
    default: 'USD'
  },
  dollar_rate_used: {
    type: Number
  },
  total_amount: Number,
  total_usd: Number,
  total_ars: Number,
  days_of_stay: Number,
  parts: [
    {
      bikepart_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BikePart' },
      description: String,           
      unit_price: Number,
      currency: {
        type: String,
        enum: ['USD', 'ARS']
      },             
      amount: Number,
      subtotal: Number
    }
  ],
  services: [
    {
      service_id: { type:mongoose.Schema.Types.ObjectId, ref: 'Service' },
      name: String,
      description: String,
      price_usd: Number,
      warranty: warrantySchema,
      covered_by_warranty: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget', default: null }
    }
  ],
  client_at_creation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  }
}, { timestamps: true });

budgetSchema.pre('save', function (next) {
  if (this.currency === 'USD') {
    return next();
  }

  if (
    !this.isModified('currency') &&
    !this.isModified('dollar_rate_used')
  ) {
    return next();
  }

  if (!this.dollar_rate_used) {
    return next(new Error("Presupuesto en USD sin cotización de dólar"));
  }
  
  next();
});

export default mongoose.model('Budget', budgetSchema);