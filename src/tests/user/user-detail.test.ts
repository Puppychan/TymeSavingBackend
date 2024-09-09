import { NextRequest } from "next/server";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import { GET, DELETE } from "src/app/api/user/[username]/route";
import { defaultUser } from "../support-data";
import * as AuthLib from "src/lib/authentication"
import mongoose from "mongoose";

// Mock the dependencies
jest.mock("src/models/user/model", () => ({
  findOne: jest.fn(),
  deleteOne: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyUser: jest.fn(),
}));
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
}));


describe("User Handlers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("verification PASSED and user exists -> should return user information", async () => {
      jest.spyOn(User, "findOne").mockReturnValue({
        select: jest.fn().mockResolvedValue(defaultUser),
        exec: jest.fn().mockResolvedValue(defaultUser),
      } as any);

      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await GET(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.response).toEqual(defaultUser);
    });

    it("verification FAILED -> should return unauthorized", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await GET(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.response).toEqual('Unauthorized: Token is required in request header');
    });

    it('verification PASSED and user not found -> should return 404 ', async () => {
      jest.spyOn(User, "findOne").mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const req = {} as NextRequest;
      const params = { username: 'unknown_user' };
      const res = await GET(req, { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.response).toBe('User not found');
    });

    it('should handle errors', async () => {
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockImplementationOnce(() => { throw error; });

      const req = {} as NextRequest;
      const params = { username: 'john_doe' };
      const res = await GET(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.response).toBe(error.message);
    });
  });


  describe('DELETE', () => {

    it('verification PASSED and user exists -> should delete user', async () => {
      jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
        startTransaction: jest.fn().mockResolvedValue(null),
        commitTransaction: jest.fn().mockResolvedValue(null),
        abortTransaction: jest.fn().mockResolvedValue(null),
        endSession: jest.fn().mockResolvedValue(null),
      } as any);
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);
      jest.spyOn(User, "deleteOne").mockResolvedValue({ username: defaultUser.username } as any);

      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await DELETE(req, { params });
      const json = await res.json();

      expect(User.deleteOne).toHaveBeenCalledWith({ username: defaultUser.username });
      expect(res.status).toBe(200);
      expect(json.response).toBe('User deleted successfully.');
    });

    it("verification FAILED -> should return unauthorized", async () => {
      jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
        startTransaction: jest.fn().mockResolvedValue(null),
        commitTransaction: jest.fn().mockResolvedValue(null),
        abortTransaction: jest.fn().mockResolvedValue(null),
        endSession: jest.fn().mockResolvedValue(null),
      } as any);
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await DELETE(req, { params });
      const json = await res.json();

      expect(User.deleteOne).toHaveBeenCalledTimes(0);
      expect(res.status).toBe(401);
      expect(json.response).toEqual('Unauthorized: Token is required in request header');
    });

    it('verification PASSED and user not found -> should return 404', async () => {
      jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
        startTransaction: jest.fn().mockResolvedValue(null),
        commitTransaction: jest.fn().mockResolvedValue(null),
        abortTransaction: jest.fn().mockResolvedValue(null),
        endSession: jest.fn().mockResolvedValue(null),
      } as any);
      jest.spyOn(User, "findOne").mockResolvedValue(null);
      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await DELETE(req, { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.response).toBe('No such user.');
    });

    it('should handle errors', async () => {
      jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
        startTransaction: jest.fn().mockResolvedValue(null),
        abortTransaction: jest.fn().mockResolvedValue(null),
        endSession: jest.fn().mockResolvedValue(null),
      } as any);
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockImplementationOnce(() => { throw error; });

      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await DELETE(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.response).toBe(`${defaultUser.username} could not be deleted.`);
    });
  });
  
});
