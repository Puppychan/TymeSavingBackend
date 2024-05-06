import mongoose from "mongoose";

let isConnected = false;


export const connectMongoDB = async () => {
  const MONGODB_URI: string = process.env.MONGODB_URI || '';
  mongoose.set("strictQuery", true);

  if (isConnected) {
    return;
  }
  try {
    await mongoose.connect(
      MONGODB_URI, 
      {
        // dbName: "share_prompt",
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
