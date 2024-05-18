import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import { GET, PUT, DELETE } from "src/app/api/user/[username]/route";
import { defaultUser } from "../support-data";

// Mock the dependencies
jest.mock("src/config/connectMongoDB");
jest.mock("src/models/user/model");

describe("User Handlers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
  afterEach(async () => {
    // await disconnectDB();
    jest.clearAllMocks();
  });

  afterAll(async () => {  
    await disconnectDB();
  });

  describe("GET", () => {
    it("should return user information if user exists", async () => {
      const mockUser = { ...defaultUser };
      // The exec method is typically part of the Mongoose query chain and should be mocked to return the expected result.
      jest.spyOn(User, "findOne").mockReturnValue({
        select: jest.fn().mockResolvedValueOnce(mockUser),
        exec: jest.fn().mockResolvedValueOnce(mockUser),
      } as any);

      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await GET(req, { params });

      const json = await res.json();

      const { password, ...expectedUser } = mockUser;

      expect(res.status).toBe(200);
      expect(json.response).toEqual(mockUser);
    });

    it('should return 404 if user not found', async () => {
      jest.spyOn(User, "findOne").mockReturnValue({
        select: jest.fn().mockResolvedValueOnce(null),
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      const req = {} as NextRequest;
      const params = { username: 'unknown_user' };
      const res = await GET(req, { params });
      console.log("User", res);
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

  // describe('PUT', () => {
  //   it('should update user information if user exists', async () => {
  //     const mockUser = {
  //       username: 'john_doe',
  //       email: 'john@example.com',
  //       fullname: 'John Doe',
  //       save: jest.fn().mockResolvedValueOnce({}),
  //     };
  //     (User.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
  //     (User.findOne as jest.Mock).mockResolvedValueOnce({ select: jest.fn().mockResolvedValueOnce(mockUser) });

  //     const req = {
  //       json: jest.fn().mockResolvedValueOnce({
  //         newUsername: 'johnny_doe',
  //         newEmail: 'johnny@example.com',
  //         newFullname: 'Johnny Doe',
  //         newPhone: '1234567890',
  //         newPassword: 'new_password',
  //       }),
  //     } as unknown as NextRequest;
  //     const params = { username: 'john_doe' };
  //     const res = await PUT(req, { params });
  //     const json = await res.json();

  //     expect(res.status).toBe(200);
  //     expect(json.response).toEqual(mockUser);
  //   });

  //   it('should return 404 if user not found', async () => {
  //     (User.findOne as jest.Mock).mockResolvedValueOnce(null);

  //     const req = {
  //       json: jest.fn().mockResolvedValueOnce({}),
  //     } as unknown as NextRequest;
  //     const params = { username: 'unknown_user' };
  //     const res = await PUT(req, { params });
  //     const json = await res.json();

  //     expect(res.status).toBe(404);
  //     expect(json.response).toBe('User not found');
  //   });

  //   it('should handle errors', async () => {
  //     const error = new Error('Database error');
  //     (User.findOne as jest.Mock).mockImplementationOnce(() => { throw error; });

  //     const req = {
  //       json: jest.fn().mockResolvedValueOnce({}),
  //     } as unknown as NextRequest;
  //     const params = { username: 'john_doe' };
  //     const res = await PUT(req, { params });
  //     const json = await res.json();

  //     expect(res.status).toBe(500);
  //     expect(json.response).toBe('Cannot update user john_doe');
  //   });
  // });

  describe('DELETE', () => {
    it('should delete user if user exists', async () => {
      const mockUser = { username: defaultUser.username };
      jest.spyOn(User, "findOne").mockResolvedValue({ username: defaultUser.username });
      (User.deleteOne as jest.Mock).mockResolvedValueOnce({});


      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await DELETE(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.response).toBe('User deleted successfully.');
    });

    it('should return 400 if user not found', async () => {
      jest.spyOn(User, "findOne").mockResolvedValue(null);

      const req = {} as NextRequest;
      const params = { username: defaultUser.username };
      const res = await DELETE(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.response).toBe('No such user.');
    });

    it('should handle errors', async () => {
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
