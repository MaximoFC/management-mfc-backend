import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Database connected');
    } catch (error) {
        console.log('Error connecting database: ', error);
        process.exit(1);
    }
};

export default connectDB;