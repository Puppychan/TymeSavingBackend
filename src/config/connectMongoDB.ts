import mongoose from "mongoose";

let isConnected = false;
const MONGODB_URI: string = process.env.MONGODB_URI || '';

export const connectMongoDB = async () => {
  mongoose.set("strictQuery", true);

  if (isConnected) {
    return;
  }
  try {
    await mongoose.connect(
      MONGODB_URI, 
      {
        // dbName: "share_prompt",
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
      }
    );

    isConnected = true;

    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }
};
