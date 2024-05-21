// tests/user.test.js
import { createMocks } from "node-mocks-http";
import { POST } from "../../app/api/user/signin/route";
import { NextRequest } from "next/server";
import { disconnectDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import { defaultUser } from "../support-data";
import { UserRole } from "src/models/user/interface";
import bcrypt from 'bcrypt';


jest.mock('bcrypt');

describe("/api/user/signin", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {  
    await disconnectDB();
  });

  test("SIGN IN: Success", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);
    (bcrypt.compare as jest.Mock).mockImplementation((password, hash, callback) => {
      callback(null, true);
    });

    const body = {username: defaultUser.username, password: defaultUser.password}
    // simulate the request body
    let req = {
      json: async () => (body),
    } as NextRequest;

    // simulate the POST request
    const res = await POST(req);
    const json = await res.json();
    console.log(json.response)

    expect(res.status).toBe(200);
    expect(json.response.role).toEqual(UserRole.Admin);
  });

  test("SIGN IN: Success (role not found -> auto assume Customer)", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue({...defaultUser, role: undefined});
    (bcrypt.compare as jest.Mock).mockImplementation((password, hash, callback) => {
      callback(null, true);
    });

    const body = {username: defaultUser.username, password: defaultUser.password}
    // simulate the request body
    let req = {
      json: async () => (body),
    } as NextRequest;

    // simulate the POST request
    const res = await POST(req);
    const json = await res.json();
    console.log(json.response)

    expect(res.status).toBe(200);
    expect(json.response.role).toEqual(UserRole.Customer);
  });

  test("SIGN IN: not found username", async () => {
    // // Mock the functions
    jest
    .spyOn(User, "findOne")
    .mockResolvedValueOnce(null);

    // simulate the request body
    let req = {
      json: async () => ({username: 'something', password: defaultUser.password}),
    } as NextRequest;

    // simulate the POST request
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Login credentials invalid. No account with username something');
  });

  test("SIGN IN: wrong password", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);
    (bcrypt.compare as jest.Mock).mockImplementation((password, hash, callback) => {
      callback(null, false);
    });

    // simulate the request body
    let req = {
      json: async () => ({username: defaultUser.username, password: 'wrongpassword'}),
    } as NextRequest;

    // simulate the POST request
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Login credentials invalid. Wrong password');
  });

  test("Internal server error", async () => {
    // Mock the functions
    jest.spyOn(User, "findOne").mockImplementationOnce(() => {
      throw new Error("Internal error");
    })

    const req = {
      json: async () => ({username: defaultUser.username, password: defaultUser.password}),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toEqual("Internal error");
  });
});
