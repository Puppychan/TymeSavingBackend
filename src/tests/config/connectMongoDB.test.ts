import mongoose, {set, connect} from "mongoose";
import { connectMongoDB, disconnectDB, setIsConnected } from "src/config/connectMongoDB";

// jest.mock("mongoose", () => ({
//   connect: jest.fn(),
//   connection: {
//     close: jest.fn(),
//     readyState: 0,
//   },
//   set: jest.fn(),
// }));
// const originalEnv: NodeJS.ProcessEnv = { ...process.env }


describe("MongoDB Connection", () => {
  let originalEnv: NodeJS.ProcessEnv = { ...process.env }
  let setSpy
  let connectSpy
  let closeSpy

  beforeEach(async () => {
    jest.resetAllMocks();
    await disconnectDB();
    console.log = jest.fn(); // Mock console.log
    setSpy = jest.spyOn(mongoose, "set")
    connectSpy = jest.spyOn(mongoose, "connect")
    closeSpy = jest.spyOn(mongoose.connection, "close")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    process.env = {...originalEnv};
  });

  afterAll(async () => {
    await disconnectDB();
    process.env = {...originalEnv};
  });

  describe("connectMongoDB", () => {
    it("should connect successfully if not connected", async () => {
      // Mock not connected environment
      setIsConnected(false);
      
      await connectMongoDB();

      expect(setSpy).toHaveBeenCalledWith("strictQuery", true);
      expect(connectSpy).toHaveBeenCalledWith(process.env.MONGODB_URI, {
        dbName: process.env.MONGODB_DBNAME,
      });
      expect(mongoose.connection.readyState).toBe(1);
      expect(console.log).toHaveBeenCalledWith("MongoDB connected");
    });

    it("should not connect if already connected: ready state = 1", async () => {
      // Mock connected environment
      Object.defineProperty(mongoose.connection, "readyState", {
        value: 1,
        writable: true,
      });

      // Call connectMongoDB
      await connectMongoDB();

      expect(setSpy).toHaveBeenCalledWith("strictQuery", true);
      expect(connectSpy).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith("MongoDB already connected");
    });

    it("should not connect if empty MONGODB_URI or MONGODB_DBNAME", async () => {
      process.env.MONGODB_URI = "";
      await connectMongoDB();

      expect(connectSpy).not.toHaveBeenCalled();
    });

    
    it("should handle connection error", async () => {
      // Mock not connected environment
      setIsConnected(false);

      const error = new Error("Connection error");
      jest.spyOn(mongoose, "connect").mockRejectedValueOnce(error);

      await connectMongoDB();

      expect(console.log).toHaveBeenCalledWith(error);
      expect(mongoose.connection.readyState).toBe(0);
    });

  });

  describe("disconnectDB", () => {
    beforeEach(async () => {
      await connectMongoDB();
    });

    it("should disconnect successfully", async () => {
      await disconnectDB();

      expect(closeSpy).toHaveBeenCalled();
      expect(mongoose.connection.readyState).toBe(0);
    });

    it("should handle disconnection error", async () => {
      const error = new Error("Connection error");
      // jest.spyOn(mongoose.connection, "close").mockRejectedValueOnce(error);
      closeSpy.mockRejectedValueOnce(error);
      jest.spyOn(process, "exit").mockImplementation()

      await disconnectDB();

      // expect(console.log).toHaveBeenCalledWith(error);
      expect(process.exit).toHaveBeenCalledWith(1)
    });

  });
});
