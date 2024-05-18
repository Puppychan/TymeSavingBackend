import mongoose from "mongoose";

let isConnected = false;

export const connectMongoDB = async () => {
  const MONGODB_URI: string = process.env.MONGODB_URI || '';
  mongoose.set("strictQuery", true);

  if (isConnected) {
    console.log("MongoDB already connected")
    return;
  }
  try {
    await mongoose.connect(
      MONGODB_URI, 
      {
        dbName: "tymedata",
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
