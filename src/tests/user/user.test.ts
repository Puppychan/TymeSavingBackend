// tests/user.test.js
import { createMocks } from "node-mocks-http";
import { POST } from "../../app/api/user/signup/route";
import { NextRequest } from "next/server";
import { disconnectDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import { defaultUser } from "../support-data";

// const res: jest.Mocked<NextResponse> = {
//   status: jest.fn().mockReturnThis(),
//   response: jest.fn(),
// } as unknown as jest.Mocked<NextResponse>;

describe("/api/user", () => {
  beforeEach(async () => {

    jest.resetAllMocks();
  });
  afterEach(async () => {
    await disconnectDB();
    jest.clearAllMocks();
  });

  // test("GET /api/user - Success", async () => {
  //   const { req, res } = createMocks({
  //     method: "GET",
  //   });

  //   // await POS(req, res);

  //   expect(res._getStatusCode()).toBe(200);
  //   expect(Array.isArray(JSON.parse(res._getData()))).toBeTruthy();
  // });

  test("POST /api/user/signup - Success", async () => {
    // Mock the functions
    jest.spyOn(User, "findOne").mockReturnValue(null).mockReturnValue(null);
    // Mock to ensure the save function is called but not saving to the database
    jest.spyOn(User.prototype, "save").mockResolvedValueOnce(null);


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

  test("Username already used", async () => {
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

  test("Email already used", async () => {
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

  test("Invalid Password", async () => {
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



  test("Internal server error", async () => {
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
