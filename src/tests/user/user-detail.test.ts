import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import { GET, DELETE } from "src/app/api/user/[username]/route";
import { defaultUser } from "../support-data";
import * as AuthLib from "src/lib/authentication"

// Mock the dependencies
jest.mock("src/config/connectMongoDB");
jest.mock("src/models/user/model");

describe("User Handlers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {  
    await disconnectDB();
  });

  describe("GET", () => {
    it("verification PASSED and user exists -> should return user information", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      jest.spyOn(User, "findOne").mockReturnValue({
        select: jest.fn().mockResolvedValueOnce(defaultUser),
        exec: jest.fn().mockResolvedValueOnce(defaultUser),
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
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      jest.spyOn(User, "findOne").mockReturnValue({
        select: jest.fn().mockResolvedValueOnce(null),
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      const req = {} as NextRequest;
      const params = { username: 'unknown_user' };
      const res = await GET(req, { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.response).toBe('User not found');
    });

    it('should handle errors', async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: '', status: 200 })
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
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: '', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue({ username: defaultUser.username });
      (User.deleteOne as jest.Mock).mockResolvedValueOnce({});

      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await DELETE(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.response).toBe('User deleted successfully.');
    });

    it("verification FAILED -> should return unauthorized", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await DELETE(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.response).toEqual('Unauthorized: Token is required in request header');
    });

    it('verification PASSED and user not found -> should return 404', async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: '', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(null);
      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await DELETE(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toBe('No such user.');
    });

    it('should handle errors', async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: '', status: 200 })
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
