// tests/user.test.js
import { createMocks } from "node-mocks-http";
import { POST } from "../../app/api/user/signup/route";
import { NextRequest, NextResponse } from "next/server";
import { IUser } from "src/models/user/interface";
import { connectMongoDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import { passwordValidator } from "src/lib/validator";

// const res: jest.Mocked<NextResponse> = {
//   status: jest.fn().mockReturnThis(),
//   response: jest.fn(),
// } as unknown as jest.Mocked<NextResponse>;

describe("/api/user", () => {
  test("GET /api/user - Success", async () => {
    const { req, res } = createMocks({
      method: "GET",
    });

    // await POS(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(Array.isArray(JSON.parse(res._getData()))).toBeTruthy();
  });

  test("POST /api/user/signup - Success", async () => {
    jest.mock("src/models/user/model.ts", () => ({
      User: {
        findOne: jest.fn(),
      },
    }));

    // // Mock the functions
    // (connectMongoDB as jest.Mock).mockResolvedValueOnce(null);
    // (User.findOne as jest.Mock).mockResolvedValueOnce(null);
    // jest.spyOn(User, 'findOne').mockReturnValue(Promise.resolve({ email: "test@gmail.com" }))
    jest.spyOn(User, 'findOne').mockReturnValue(null)

    // (hashPassword as jest.Mock).mockResolvedValueOnce('hashedPassword');
    // (User.prototype.save as jest.Mock).mockResolvedValueOnce(null);
    // simulate the request body
    let req = {
      json: async () => ({
        username: "hakhanhne",
        phone: "0938881145",
        email: "hakhanhne@gmail.com",
        password: "Rmit123@",
        fullname: "Khanh Tran",
      }),
    } as NextRequest;

    // simulate the POST request
    const res = await POST(req);

    const json = await res.json();
    console.log("res", res, " - json: ", json);

    expect(res.status).toBe(200);
    expect(json.response.fullname).toEqual("Khanh Tran");
  });

  // Additional tests for PUT, DELETE, and other scenarios like error handling
});
