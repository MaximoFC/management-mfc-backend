import mongoose from "mongoose";

const bikeSchema = new mongoose.Schema({
    brand: {
        type: String,
        required: true,
        trim: true
    },
    model: {
        type: String,
        required: true,
        trim: true
    },
    color: {
        type: String,
        trim: true
    },
    serialNumber: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
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
            from: { type: Date },
            to: { type: Date }
        }
    ]
}, {
    timestamps: true
});

export default mongoose.model('Bike', bikeSchema);