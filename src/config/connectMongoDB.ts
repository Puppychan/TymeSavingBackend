import mongoose from "mongoose";

let isConnected = false;

export const connectMongoDB = async () => {
  const MONGODB_URI: string = process.env.MONGODB_URI;
  mongoose.set("strictQuery", true);
  if (mongoose.connection.readyState === 1 || isConnected) {
    console.log("MongoDB already connected")
    return;
  }
  try {
    await mongoose.connect(
      MONGODB_URI, 
      {
        dbName: process.env.MONGODB_DBNAME,
      }
    );

    // isConnected = true;

    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    isConnected = false;
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};