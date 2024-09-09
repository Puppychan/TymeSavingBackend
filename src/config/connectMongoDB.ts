import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

export function setIsConnected(newValue: boolean) {
  isConnected = newValue;
}

export const connectMongoDB = async () => {
  try {
    const MONGODB_URI: string = process.env.MONGODB_URI;
    const MONGODB_DBNAME: string = process.env.MONGODB_DBNAME;
    
    mongoose.set("strictQuery", true);
    
    if (!MONGODB_URI || !MONGODB_DBNAME || MONGODB_URI === "" || MONGODB_DBNAME === "") {
      console.log("MONGODB_URI or MONGODB_DBNAME is not provided");
      return;
    }

    if (mongoose.connection.readyState === 1 || isConnected) {
      console.log("MongoDB already connected")
      return;
    }
    
    await mongoose.connect(
      MONGODB_URI, 
      {
        dbName: MONGODB_DBNAME
      }
    );

    setIsConnected(true);

    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }
};

export const disconnectDB = async () => {
  try {
    console.log("Disconnecting from MongoDB");
    await mongoose.connection.close();
    setIsConnected(false);
    console.log("Disconnected from MongoDB");
  } catch (err) {
    console.log("Error disconnecting from MongoDB", err);
    process.exit(1);
  }
};


