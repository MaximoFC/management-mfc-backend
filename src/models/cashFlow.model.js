import mongoose, { mongo } from "mongoose";

const cashFlowSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['ingreso', 'egreso'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
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
});

export default mongoose.model('CashFlow', cashFlowSchema);