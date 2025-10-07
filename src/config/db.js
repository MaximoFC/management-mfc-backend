import mongoose from "mongoose";

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI not defined in .env");
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10
        });

        console.log('Database connected successfully');

        mongoose.connection.on("disconnected", () => {
            console.warn("MongoDB disconnected");
        });

        mongoose.connection.on("reconnected", () => {
            console.log("MongoDB reconnected");
        });
    } catch (error) {
        console.log('Error connecting database: ', error.message);
        process.exit(1);
    }
};

export default connectDB;