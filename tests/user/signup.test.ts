// tests/user.test.js
import { POST } from "../../app/api/user/signup/route";
import { NextRequest } from "next/server";
import { disconnectDB } from "../../config/connectMongoDB";
import User from "../../models/user/model";
import { defaultUser } from "../support-data";

describe("/api/user/signup", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {  
    await disconnectDB();
  });

  test("SIGN UP: Success", async () => {
    // Mock the functions
    jest.spyOn(User, "findOne").mockReturnValue(null).mockReturnValue(null);
    // Mock to ensure the save function is called but not saving to the database
    jest.spyOn(User.prototype, "save").mockImplementation();

    // simulate the request body
    let req = {
      json: async () => (defaultUser),
    } as NextRequest;

    // simulate the POST request
    const res = await POST(req);

    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response.fullname).toEqual(defaultUser.fullname);
  });

  test("SIGN UP: Username already used", async () => {
    // Mock the functions
    jest.spyOn(User, "findOne").mockResolvedValue({ username: defaultUser.username });

    const req = {
      json: async () => (defaultUser),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual("This username is already used");
  });

  test("SIGN UP: Email already used", async () => {
    // Mock the functions to return null for the first call (findOne by username) and a user object for the second call (findOne by email)
    jest
      .spyOn(User, "findOne")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ email: defaultUser.email });
    const req = {
      json: async () => (defaultUser),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual("This email is already used");
  });

  test("SIGN UP: Invalid Username", async () => {
    // Mock the functions
    // mock for findOne by username and email
    jest.spyOn(User, "findOne").mockReturnValue(null).mockReturnValue(null);

    const req = {
      json: async () => ({
        ...defaultUser,
        username: "hi"
      }),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual("Username must be at least 5 characters and at most 15 characters");
  });

  test("SIGN UP: Invalid Password", async () => {
    // Mock the functions
    // mock for findOne by username and email
    jest.spyOn(User, "findOne").mockReturnValue(null).mockReturnValue(null);

    const req = {
      json: async () => ({
        ...defaultUser,
        password: "123123",
      }),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual("Password must be at least 8 characters and at most 20 characters");
  });


  test("SIGN UP: Internal server error", async () => {
    // Mock the functions
    jest.spyOn(User, "findOne").mockImplementationOnce(() => {
      throw new Error("Internal error");
    })

    const req = {
      json: async () => (defaultUser),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toEqual("Internal error");
  });
});
