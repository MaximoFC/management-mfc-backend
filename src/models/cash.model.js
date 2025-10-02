import mongoose from "mongoose";

const cashSchema = new mongoose.Schema({
    balance: {
        type: Number,
        required: true,
        default: 0
    }
}, { timestamps: true });

export default mongoose.model('Cash', cashSchema);