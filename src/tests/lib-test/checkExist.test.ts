import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import { defaultUser } from "../support-data";
import { exist_email, exist_username } from "src/lib/checkExist";
import User from "src/models/user/model";

jest.mock("src/config/connectMongoDB", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(null),
  disconnectDB: jest.fn().mockResolvedValue(null),
}));

// jest.mock("src/models/user/model");

describe("Check Exist", () => {
  beforeAll(async () => {
    await connectMongoDB();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });
  
  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {  
    await disconnectDB();
  });

  describe("exist_username", () => {
    it("should return true for existing username", async () => {
      jest.spyOn(User, "findOne").mockResolvedValue({ username: defaultUser.username });

      const result = await exist_username(defaultUser.username);
      expect(result).toBe(true);
    });

    it("should return false for not existing username", async () => {
      jest.spyOn(User, "findOne").mockResolvedValue(null);

      const result = await exist_username('test_username');
      expect(result).toBe(false);
    });

    it("should return true for error caught", async () => {
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockImplementationOnce(() => { throw error; });

      const result = await exist_username('test_username');
      expect(result).toBe(true);
    });
  });

  describe("exist_email", () => {
    it("should return true for existing email", async () => {
      jest.spyOn(User, "findOne").mockResolvedValue({ email: defaultUser.email });

      const result = await exist_email(defaultUser.email);
      expect(result).toBe(true);
    });

    it("should return false for not existing email", async () => {
      jest.spyOn(User, "findOne").mockResolvedValue(null);

      const result = await exist_email('test_email@gmail.com');
      expect(result).toBe(false);
    });

    it("should return true for error caught", async () => {
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockImplementationOnce(() => { throw error; });

      const result = await exist_email('test_email@gmail.com');
      expect(result).toBe(true);
    });
  });
});
