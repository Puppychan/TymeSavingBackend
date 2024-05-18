import mongoose from "mongoose";
import { after, before } from "node:test";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";

const originalFilePath = "src/config/connectMongoDB";

jest.mock("mongoose", () => ({
  connect: jest.fn(),
  connection: {
    close: jest.fn(),
    readyState: 0,
  },
  set: jest.fn(),
}));

describe("MongoDB Connection", () => {
  let originalEnv: NodeJS.ProcessEnv;
  const originalReadyState = mongoose.connection.readyState;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.resetModules(); // Reset module registry to reset isConnected
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
  });

  afterEach(() => {
    // Restore the original readyState value
    Object.defineProperty(mongoose.connection, "readyState", {
      value: originalReadyState,
      writable: true,
    });
  });

  describe("connectMongoDB", () => {
    it("should not connect if already connected", async () => {
      // Mock readyState as 1 - connected environment
      Object.defineProperty(mongoose.connection, "readyState", {
        value: 1,
        writable: true,
      });

      // Call connectMongoDB
      await connectMongoDB();

      expect(mongoose.connect).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith("MongoDB already connected");
    });

    it("should connect successfully if not connected", async () => {
      // Mock readyState as 0 - not connected environment
      Object.defineProperty(mongoose.connection, "readyState", {
        value: 0,
        writable: true,
      });

      await connectMongoDB();

      expect(mongoose.set).toHaveBeenCalledWith("strictQuery", true);
      expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGODB_URI, {
        dbName: "tymedata",
      });
      expect(console.log).toHaveBeenCalledWith("MongoDB connected");
    });

    // test("should handle connection error", async () => {
    //   // Mock readyState as 0 - not connected environment to get into the try catch block
    //   Object.defineProperty(mongoose.connection, "readyState", {
    //     value: 0,
    //     writable: true,
    //   });

    //   const error = new Error("Connection error");

    //   // Mock isConnected as false
    //   jest.doMock(originalFilePath, () => {
    //     const originalModule = jest.requireActual(
    //       originalFilePath
    //     );
    //     return {
    //       __esModule: true,
    //       ...originalModule,
    //       isConnected: false,
    //     };
    //   });

    //   jest.spyOn(mongoose, "connect").mockRejectedValueOnce(error);

    //   const { connectMongoDB } = await import(originalFilePath);


    //   await connectMongoDB();

    //   expect(console.log).toHaveBeenCalledWith(error);
    // });
  });

  describe("disconnectDB", () => {
    beforeEach(async () => {
      await connectMongoDB();
    });
    it("should disconnect successfully", async () => {
      await disconnectDB();

      expect(mongoose.connection.close).toHaveBeenCalled();
      expect(mongoose.connection.readyState).toBe(0);
    });

    // test("should handle disconnection error", async () => {
    //   const error = new Error("Disconnection error");
    //   (mongoose.connection.close as jest.Mock).mockRejectedValueOnce(error);
    //   const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {});

    //   await disconnectDB();

    //   expect(mongoose.connection.close).toHaveBeenCalled();
    //   expect(console.log).toHaveBeenCalledWith(error);
    //   expect(exitSpy).toHaveBeenCalledWith(1);

    //   exitSpy.mockRestore();
    // });
  });
});
