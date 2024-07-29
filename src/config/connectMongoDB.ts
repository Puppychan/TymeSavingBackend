import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

export const connectMongoDB = async () => {
  const MONGODB_URI: string = process.env.MONGODB_URI || '';
  const MONGODB_DBNAME: string = process.env.MONGODB_DBNAME;
  console.log(MONGODB_DBNAME)
  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1 || isConnected) {
    console.log("MongoDB already connected")
    return;
  }
  try {
    await mongoose.connect(
      MONGODB_URI, 
      {
        // dbName: MONGODB_DBNAME,
        dbName: "tymetest",
        // useNewUrlParser: true,    //default is true -> remove
        // useUnifiedTopology: true, //default is true -> remove
      }
    );

    isConnected = true;

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