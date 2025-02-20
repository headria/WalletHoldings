import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

export let db: any = {};

console.log({
    server: process.env.MONGO_CONNECTION_URI_SERVER,
    port: process.env.MONGO_CONNECTION_URI_PORT,
    username: process.env.MONGO_CONNECTION_URI_USERNAME,
    password: process.env.MONGO_CONNECTION_URI_PASSWORD,
});

var mongoConnectionUri: any = {
    server: process.env.MONGO_CONNECTION_URI_SERVER || "127.0.0.1",
    port: process.env.MONGO_CONNECTION_URI_PORT || "27017",
    username: process.env.MONGO_CONNECTION_URI_USERNAME || "",
    password: process.env.MONGO_CONNECTION_URI_PASSWORD || "",
    database: process.env.MONGO_DATABASE_NAME || "wallet-holders",
    shard: false,
};

export var CONNECTION_URI =
    process.env.MONGO_CONNECTION_URI ||
    `mongodb://${mongoConnectionUri.server}:${mongoConnectionUri.port}/${mongoConnectionUri.database}`;

if (mongoConnectionUri.username && mongoConnectionUri.password) {
    CONNECTION_URI = `mongodb://${mongoConnectionUri.username}:${mongoConnectionUri.password}@${mongoConnectionUri.server}:${mongoConnectionUri.port}/${mongoConnectionUri.database}`;
}

if (process.env.MONGO_CONNECTION_URI) {
    CONNECTION_URI = process.env.MONGO_CONNECTION_URI;
}

var options: any = {
    dbName: mongoConnectionUri.database,
};

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(CONNECTION_URI, {
            ...options,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log('Using database:', mongoConnectionUri.database);
        
        // Log all database operations in development
        mongoose.set('debug', true);
        
    } catch (error: any) {
        console.error('MongoDB connection error:', error.message);
        process.exit(1);
    }
};

export default connectDB; 