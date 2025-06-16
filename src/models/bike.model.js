import mongoose from "mongoose";

const bikeSchema = new mongoose.Schema({
    brand: String,
    model: String,
    color: String,
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Bike', bikeSchema);