import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import { PUT } from "src/app/api/user/[username]/update/route";
import { defaultUser } from "../support-data";
import * as AuthLib from "src/lib/authentication"
import * as CheckExistLib from "src/lib/checkExist"
import { POST as POSTPassword } from "src/app/api/user/[username]/update/password/route";
import { POST as POSTPin} from "src/app/api/user/[username]/update/pin/route";
import bcrypt from 'bcrypt';

// Mock the dependencies
jest.mock("src/config/connectMongoDB");
jest.mock("src/models/user/model");

describe("Update User api/user/[username]/update/", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {  
    await disconnectDB();
  });

  describe("Update User: api/user/[username]/update/route.ts", () => {
    it("success", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser)
      const updated = {...defaultUser, fullname: "Khanh"}
      jest.spyOn(User, "findOneAndUpdate").mockResolvedValue(updated)
      
      const req = {
        json: async () => ({
          fullname: "Khanh" 
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.response).toEqual(updated);
    });

    it("verification FAILED -> should return unauthorized", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })
      const req = {
        json: async () => ({
          fullname: "Khanh" 
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.response).toEqual('Unauthorized: Token is required in request header');
    });

    it('verification PASSED and user not found -> should return 404 ', async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(null)

      const req = {
        json: async () => ({
          fullname: "Khanh" 
        }),
      } as NextRequest;
      const params = { username: 'unknown_user' };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.response).toBe('User not found');
    });

    it('should handle errors', async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockImplementationOnce(() => { throw error; });

      const req = {
        json: async () => ({
          fullname: "Khanh" 
        }),
      } as NextRequest;
      const username = defaultUser.username
      const params = { username: username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.response).toBe(`Cannot update user ${username}`);
    });

    it("failed: update with exist username", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser)
      jest.spyOn(CheckExistLib, "exist_username").mockResolvedValue(true)
      
      const req = {
        json: async () => ({
          username: 'existusername'
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toEqual('This username is used by another account');
    });

    it("failed: update with invalid username", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser)
      jest.spyOn(CheckExistLib, "exist_username").mockResolvedValue(false)
      
      const req = {
        json: async () => ({
          username: 'hi;'
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toEqual('Username must be at least 5 characters and at most 15 characters');
    });

    
    it("failed: update with exist username", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser)
      jest.spyOn(CheckExistLib, "exist_email").mockResolvedValue(true)
      
      const req = {
        json: async () => ({
          email: 'existemail'
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toEqual('This email is used by another account');
    });
  });

  describe("Change password", () => {
    it("success", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 });
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);
      jest.spyOn(AuthLib, "checkPassword").mockResolvedValue(true)
      jest.spyOn(User, "findOneAndUpdate").mockImplementation();
      
      const req = {
        json: async () => ({
          newPassword: "Rmit123@new",
          currentPassword: "Rmit123@" 
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPassword(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.response).toEqual("Password is updated successfully");
    });

    it("fail: wrong password", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 });
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);
      jest.spyOn(AuthLib, "checkPassword").mockResolvedValue(false)
      
      const req = {
        json: async () => ({
          newPassword: "Rmit123@new",
          currentPassword: "Rmit123@" 
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPassword(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.response).toEqual("Cannot update: Password is incorrect");
    });

    it("fail: invalid password", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 });
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);
      jest.spyOn(AuthLib, "checkPassword").mockResolvedValue(false)
      
      const req = {
        json: async () => ({
          newPassword: "invalid",
          currentPassword: "Rmit123@" 
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPassword(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toEqual("Password must be at least 8 characters and at most 20 characters");
    });

    it("fail: verification FAILED -> should return unauthorized", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })
      const req = {
        json: async () => ({
          newPassword: "Rmit123@new",
          currentPassword: "Rmit123@" 
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPassword(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.response).toEqual('Unauthorized: Token is required in request header');
    });

    it("fail: user not found", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 });
      jest.spyOn(User, "findOne").mockResolvedValue(null);
      
      const req = {
        json: async () => ({
          newPassword: "Rmit123@new",
          currentPassword: "Rmit123@" 
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPassword(req, { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.response).toBe('User not found');
    });

    it('should handle errors', async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockImplementationOnce(() => { throw error; });

      const req = {
        json: async () => ({
          newPassword: "Rmit123@new",
          currentPassword: "Rmit123@" 
        }),
      } as NextRequest;
      const username = defaultUser.username
      const params = { username: username };
      const res = await POSTPassword(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.response).toBe(`Database error`);
    });
  });

  describe("Set/update pin", () => {
    it("success: update pin", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 });
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);
      const newPIN = '2345'
      const updated = {...defaultUser, pin: newPIN}
      jest.spyOn(User, "findOneAndUpdate").mockResolvedValue(updated);
      
      const req = {
        json: async () => ({
          newPIN: newPIN,
          currentPIN: defaultUser.pin
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPin(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.response).toEqual(`New PIN is set successfully: ${newPIN}`);
    });

    it("success: set pin", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 });
      jest.spyOn(User, "findOne").mockResolvedValue({...defaultUser, pin: undefined});
      const newPIN = '2345'
      const updated = {...defaultUser, pin: newPIN}
      jest.spyOn(User, "findOneAndUpdate").mockResolvedValue(updated);
      
      const req = {
        json: async () => ({
          newPIN: newPIN
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPin(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.response).toEqual(`New PIN is set successfully: ${newPIN}`);
    });

    it("fail: wrong pin", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 });
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);
      
      const req = {
        json: async () => ({
          newPIN: '2345',
          currentPIN: '0123'
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPin(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.response).toEqual(`Cannot update: PIN is incorrect`);
    });

    it("fail: invalid pin", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 });
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);
      
      const req = {
        json: async () => ({
          newPIN: '012',
          currentPIN: defaultUser.pin
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPin(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toEqual(`PIN must have 4 digits`);
    });

    it("fail: verification FAILED -> should return unauthorized", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })
      const req = {
        json: async () => ({
          newPIN: '0123',
          currentPIN: defaultUser.pin
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPin(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.response).toEqual('Unauthorized: Token is required in request header');
    });

    it("fail: user not found", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 });
      jest.spyOn(User, "findOne").mockResolvedValue(null);
      
      const req = {
        json: async () => ({
          newPIN: '0123',
          currentPIN: defaultUser.pin
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await POSTPin(req, { params });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.response).toBe('User not found');
    });

    it('should handle errors', async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockImplementationOnce(() => { throw error; });

      const req = {
        json: async () => ({
          newPIN: '0123',
          currentPIN: defaultUser.pin 
        }),
      } as NextRequest;
      const username = defaultUser.username
      const params = { username: username };
      const res = await POSTPin(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.response).toBe(`Database error`);
    });
  });
  

});
