import mongoose from "mongoose";

// let isConnected = false;

export const connectMongoDB = async () => {
  const MONGODB_URI: string = process.env.MONGODB_URI;
  mongoose.set("strictQuery", true);
  if (mongoose.connection.readyState === 1 ) {
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

    // isConnected = true;

    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    // isConnected = false;
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};