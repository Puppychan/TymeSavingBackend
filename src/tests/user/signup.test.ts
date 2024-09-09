// tests/user.test.js
import { POST } from "../../app/api/user/signup/route";
import { NextRequest, NextResponse } from "next/server";
import User from "src/models/user/model";
import { defaultUser } from "../support-data";
import mongoose from "mongoose";
import * as ValidationLib from "src/lib/validator";
import {hashPassword} from "src/lib/authentication";

const userDocumentMock = {
  ...defaultUser,
  _v: 1,
  save: jest.fn(),
  toObject: jest.fn(),
  exec: jest.fn(),
}

jest.mock('src/models/user/model', () => ({ 
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("src/lib/authentication", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashedPassword"),
}));

jest.mock('mongoose', () => ({
  startSession: jest.fn()
}));

describe("/api/user/signup", () => {
  let dbSession
  let usernameValidatorSpy
  let passwordValidatorSpy

  beforeEach(() => {
    jest.resetAllMocks();

    dbSession = jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
      startTransaction: jest.fn().mockResolvedValue(null),
      commitTransaction: jest.fn().mockResolvedValue(null),
      abortTransaction: jest.fn().mockResolvedValue(null),
      endSession: jest.fn().mockResolvedValue(null),
    } as any);
    usernameValidatorSpy = jest.spyOn(ValidationLib, "usernameValidator")
    passwordValidatorSpy = jest.spyOn(ValidationLib, "passwordValidator")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test("SIGN UP: Success", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(null);
    jest.spyOn(User, "create").mockResolvedValue([userDocumentMock]);
    userDocumentMock.toObject = jest.fn().mockReturnValue(defaultUser);

    let req = {
      json: async () => (defaultUser),
    } as NextRequest;
    // simulate the POST request
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response.username).toEqual(defaultUser.username);
    expect(json.response.password).toBeUndefined();
    expect(usernameValidatorSpy).toHaveBeenCalled();
    expect(passwordValidatorSpy).toHaveBeenCalled();
    expect(hashPassword).toHaveBeenCalled();
    expect(User.create).toHaveBeenCalled();
  });

  test("SIGN UP: Username already used", async () => {
    // Mock the functions to return the user with existing username on the first call (findOne by username)
    jest.spyOn(User, "findOne").mockResolvedValueOnce(defaultUser);

    const req = {
      json: async () => (defaultUser),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual("This username is already used " + defaultUser._id + defaultUser.username);
    expect(User.create).not.toHaveBeenCalled();
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
    expect(User.create).not.toHaveBeenCalled();
  });

  test("SIGN UP: Invalid Username", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(null);

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
    expect(usernameValidatorSpy).toHaveBeenCalled();
    expect(passwordValidatorSpy).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  test("SIGN UP: Invalid Password", async () => {
    jest.spyOn(User, "findOne").mockResolvedValue(null);

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
    expect(usernameValidatorSpy).toHaveBeenCalled();
    expect(passwordValidatorSpy).toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
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
    expect(User.create).not.toHaveBeenCalled();
  });
});
