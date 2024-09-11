// tests/user.test.js
import { POST } from "../../../app/api/user/signin/route";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
import { defaultUser } from "../../support-data";
import * as AuthLib from "src/lib/authentication";

// jest.mock("src/config/connectMongoDB", () => ({
//   connectMongoDB: jest.fn().mockResolvedValue(null),
//   disconnectDB: jest.fn().mockResolvedValue(null),
// }));
jest.mock("src/lib/authentication", () => ({
  newToken: jest.fn().mockReturnValue("token"),
  checkPassword: jest.fn(),
}));

const userDocumentMock = {
  ...defaultUser,
  _v: 1,
  save: jest.fn(),
  toObject: jest.fn(),
  exec: jest.fn(),
}

describe("Test Sign In", () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("SIGN IN: Success", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(userDocumentMock);
    jest.spyOn(AuthLib, "checkPassword").mockResolvedValue(true);
    jest.spyOn(AuthLib, "newToken").mockReturnValue("token");

    userDocumentMock.toObject = jest.fn().mockReturnValue(defaultUser);
    const body = {username: defaultUser.username, password: defaultUser.password}
    // simulate the request body
    let req = {
      json: async () => (body),
    } as NextRequest;

    // simulate the POST request
    const res = await POST(req);
    const json = await res.json();

    const expectedRes = {user: defaultUser, token: "token"}

    expect(res.status).toBe(200);
    expect(json.response).toEqual(expectedRes);
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
    jest.spyOn(User, "findOne").mockResolvedValue(userDocumentMock);
    jest.spyOn(AuthLib, "checkPassword").mockResolvedValue(false);

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
