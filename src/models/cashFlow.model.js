import mongoose from "mongoose";

const cashFlowSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['ingreso', 'egreso'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, "El monto debe ser mayor a 0"]
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null
    }
}, { timestamps: true });

export default mongoose.model('CashFlow', cashFlowSchema);