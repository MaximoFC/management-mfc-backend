import mongoose from "mongoose";

const bikeSchema = new mongoose.Schema({
    brand: String,
    model: String,
    color: String,
    serialNumber: String,
    current_owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    ownership_history: [
        {
            client_id: {type: mongoose.Schema.Types.ObjectId, ref: 'Client'},
            from: Date,
            to: Date
        }
    ]
}, {
    timestamps: true
});

export default mongoose.model('Bike', bikeSchema);