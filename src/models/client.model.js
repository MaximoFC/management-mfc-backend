import mongoose, { mongo } from "mongoose";

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2
    },
    surname: {
        type: String,
        required: true,
        trim: true,
        minlength: 2
    },
    mobileNum: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Client', clientSchema);