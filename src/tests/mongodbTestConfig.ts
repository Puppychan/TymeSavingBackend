import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let isConnected = false;
let mongoVirtual: any = null;
export const connectMongoDBTest = async () => {
  let mongoDbUri: string = process.env.MONGODB_URI || '';
  mongoose.set("strictQuery", true);

  if (isConnected) {
    console.log("MongoDB already connected")
    return;
  }
  try {
    if (process.env.NODE_ENV === 'test') {
        mongoVirtual = await MongoMemoryServer.create();
        mongoDbUri = mongoVirtual.getUri();
      }  
    await mongoose.connect(
        mongoDbUri, 
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
export const disconnectDBTest = async () => {
    try {
      await mongoose.connection.close();
      isConnected = false;
      if (mongoVirtual) {
        await mongoVirtual.stop();
      }
    } catch (err) {
      console.log(err);
      process.exit(1);
    }
  };