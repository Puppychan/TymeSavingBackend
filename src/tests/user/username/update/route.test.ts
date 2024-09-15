import { NextRequest } from "next/server";
import User from "src/models/user/model";
import { defaultUser } from "src/tests/support-data";
import * as AuthLib from "src/lib/authentication"
import * as CheckExistLib from "src/lib/checkExist"
import mongoose from "mongoose";
import { PUT } from "src/app/api/user/[username]/update/route";
import * as ValidationLib from "src/lib/validator";

const userDocumentMock = {
  ...defaultUser,
  _v: 1,
  save: jest.fn(),
  toObject: jest.fn(),
  exec: jest.fn(),
}

// Mock the dependencies
jest.mock("src/models/user/model", () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyUser: jest.fn(),
}));
jest.mock("src/lib/checkExist", () => ({
  exist_email: jest.fn(),
  exist_username: jest.fn(),
}));
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
}));


describe("Test UPDATE User", () => {
  let dbSession
  let checkExistEmail
  let checkExistUsername
  let usernameValidatorSpy

  beforeEach(() => {
    jest.resetAllMocks();
    
    dbSession = jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
      startTransaction: jest.fn().mockResolvedValue(null),
      commitTransaction: jest.fn().mockResolvedValue(null),
      abortTransaction: jest.fn().mockResolvedValue(null),
      endSession: jest.fn().mockResolvedValue(null),
    } as any);

    checkExistEmail = jest.spyOn(CheckExistLib, 'exist_email');
    checkExistUsername = jest.spyOn(CheckExistLib, 'exist_username');
    usernameValidatorSpy = jest.spyOn(ValidationLib, "usernameValidator")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("PUT: api/user/[username]/update/route.ts", () => {
    it("success: no update username/email", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: '', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);

      const payload = { fullname: "Khanh"}
      const updatedDoc = {...userDocumentMock, ...payload}
      const updated = {...defaultUser, ...payload}
      jest.spyOn(User, "findOneAndUpdate").mockResolvedValue(updatedDoc)
      updatedDoc.toObject = jest.fn().mockReturnValue(updated);

      const req = {
        json: async () => ({
          ...payload 
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.response).toEqual(updated);
      expect(updated).not.toHaveProperty('password');
      expect(checkExistEmail).not.toHaveBeenCalled();
      expect(checkExistUsername).not.toHaveBeenCalled();
      expect(usernameValidatorSpy).not.toHaveBeenCalled();
    });

    it("success: update username/email", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: '', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);

      const payload = { fullname: "Khanh", username: "new_username", email: "new_email" }
      const updatedDoc = {...userDocumentMock, ...payload}
      const updated = {...defaultUser, ...payload}
      jest.spyOn(User, "findOneAndUpdate").mockResolvedValue(updatedDoc)
      updatedDoc.toObject = jest.fn().mockReturnValue(updated);

      checkExistUsername.mockResolvedValue(false);
      checkExistEmail.mockResolvedValue(false);
      // usernameValidatorSpy.mockReturnValue({ status: true });

      const req = {
        json: async () => ({
          ...payload
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.response).toEqual(updated);
      expect(updated).not.toHaveProperty('password');
      expect(checkExistEmail).toHaveBeenCalledWith("new_email");
      expect(checkExistUsername).toHaveBeenCalledWith("new_username");
      expect(usernameValidatorSpy).toHaveBeenCalled();
    });

    it("failed: update with exist username", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: '', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);

      const payload = { fullname: "Khanh", username: "new_username", email: "new_email" }
      const updatedDoc = {...userDocumentMock, ...payload}
      jest.spyOn(User, "findOneAndUpdate").mockResolvedValue(updatedDoc)

      checkExistUsername.mockResolvedValue(true);

      const req = {
        json: async () => ({
          ...payload
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toEqual("This username is used by another account");
      expect(checkExistUsername).toHaveBeenCalledWith("new_username");
      expect(checkExistEmail).not.toHaveBeenCalled();
      expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("failed: update with invalid username", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: '', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);

      const payload = { fullname: "Khanh", username: "exceed-length-username!!", email: "new_email" }
      const updatedDoc = {...userDocumentMock, ...payload}
      jest.spyOn(User, "findOneAndUpdate").mockResolvedValue(updatedDoc)

      checkExistUsername.mockResolvedValue(false);

      const req = {
        json: async () => ({
          ...payload
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toEqual("Username must be at least 5 characters and at most 15 characters");
      expect(checkExistUsername).toHaveBeenCalledWith("exceed-length-username!!");
      expect(checkExistEmail).not.toHaveBeenCalled();
      expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    
    it("failed: update with exist email", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: '', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);

      const payload = { fullname: "Khanh", username: "new_username", email: "new_email" }
      const updatedDoc = {...userDocumentMock, ...payload}
      jest.spyOn(User, "findOneAndUpdate").mockResolvedValue(updatedDoc);

      checkExistUsername.mockResolvedValue(false);
      checkExistEmail.mockResolvedValue(true);

      const req = {
        json: async () => ({
          ...payload
        }),
      } as NextRequest;

      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toEqual("This email is used by another account");
      expect(checkExistUsername).toHaveBeenCalledWith("new_username");
      expect(checkExistEmail).toHaveBeenCalledWith("new_email");
      expect(User.findOneAndUpdate).not.toHaveBeenCalled();

    });

    it("verification FAILED -> should return unauthorized", async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

      const req = { json: async () => {}} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.response).toEqual('Unauthorized: Token is required in request header');
    });

    it('user not found -> should return 404 ', async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      jest.spyOn(User, "findOne").mockResolvedValue(null);

      const req = { json: async () => {}} as NextRequest;
      const params = { username: 'unknown_user' };
      const res = await PUT(req, { params });
      const json = await res.json();
      console.log(json)

      expect(res.status).toBe(404);
      expect(json.response).toBe('User not found');
    });

    it('should handle errors: 11000 DUPLICATE KEY', async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      const error = {
        message: "MongoServerError: E11000 duplicate key error collection: tymedata.users index: phone_1 dup key: { phone: \"0938881145\"}",
        code: 11000
      };
      (User.findOne as jest.Mock).mockImplementationOnce(() => { throw error; });

      const req = { json: async () => {}} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toBe("This phone is used by another account");
    });

    it('should handle errors: other errors', async () => {
      jest.spyOn(AuthLib, "verifyUser").mockResolvedValue({ response:'', status: 200 })
      const error = new Error('Database error');
      (User.findOne as jest.Mock).mockImplementationOnce(() => { throw error; });

      const req = { json: async () => {}} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await PUT(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.response).toBe("Cannot update user " + defaultUser.username);
    });
  });
  
});
