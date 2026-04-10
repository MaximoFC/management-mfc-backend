import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema({
    email: { type: String, required: true },
    token: { type: String, required: true },
    used: { type: Boolean, default: false },
    expiresAt: Date
}, { timestamps: true });

export default mongoose.model("Invitation", invitationSchema);