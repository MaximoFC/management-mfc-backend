import mongoose, { mongo } from "mongoose";

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    surname: {
        type: String,
        required: true
    },
    mobileNum: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Client', clientSchema);