import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    // select: false -> nunca sale en consultas ni populates salvo pedido explícito
    password: {
        type: String,
        required: true,
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'employee'],
        default: 'employee'
    },

    // Reset de password
    resetToken: { type: String, select: false, index: true },
    resetTokenExpires: { type: Date, select: false },
    // Tokens JWT emitidos antes de este momento dejan de valer
    passwordChangedAt: Date
}, {
    timestamps: true
});

export default mongoose.model('Employee', employeeSchema);