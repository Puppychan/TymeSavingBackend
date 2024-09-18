import { NextRequest } from "next/server";
import { defaultUser, mockSharedBudget } from "src/tests/support-data";
import mongoose from "mongoose";
import SharedBudget from "src/models/sharedBudget/model";
import * as SharedBudgetUtils from "src/lib/sharedBudgetUtils"
import { verifyAuth } from "src/lib/authentication";
import { UserRole } from "src/models/user/interface";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { DELETE } from "src/app/api/sharedBudget/[sharedBudgetId]/host/delete/route";
// Mock the dependencies
jest.mock("src/models/sharedBudget/model", () => ({
  exec: jest.fn(),
  findById: jest.fn(),
  findOneAndDelete: jest.fn(),
}));
jest.mock("src/models/sharedBudgetParticipation/model", () => ({
  deleteMany: jest.fn(),
  exec: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock("src/lib/sharedBudgetUtils", () => ({
  checkDeletableSharedBudget: jest.fn(),
}));
jest.mock('mongoose', () => ({
  startSession: jest.fn()
}));

describe("Test DELETE group", () => {
  let dbSession
  let checkDeletableSharedBudgetSpy

  beforeEach(() => {
    jest.resetAllMocks();
    
    dbSession = jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
      startTransaction: jest.fn().mockResolvedValue(null),
      commitTransaction: jest.fn().mockResolvedValue(null),
      abortTransaction: jest.fn().mockResolvedValue(null),
      endSession: jest.fn().mockResolvedValue(null),
    } as any);

    checkDeletableSharedBudgetSpy = jest.spyOn(SharedBudgetUtils, "checkDeletableSharedBudget")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("success: role admin", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(mockSharedBudget); 
    jest.spyOn(SharedBudgetParticipation, "deleteMany").mockResolvedValue(null);
    jest.spyOn(SharedBudget, "findOneAndDelete").mockResolvedValue(mockSharedBudget);
    checkDeletableSharedBudgetSpy.mockResolvedValue(true);

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual('Deleted successfully');
    expect(checkDeletableSharedBudgetSpy).toHaveBeenCalledWith(mockSharedBudget._id);
    expect(SharedBudgetParticipation.deleteMany).toHaveBeenCalledWith({ sharedBudget: mockSharedBudget._id }, {session: expect.any(Object)});
    expect(SharedBudget.findOneAndDelete).toHaveBeenCalledWith({ _id: mockSharedBudget._id }, {session: expect.any(Object)});
  });

  it("success: role Customer - group's host", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue({...mockSharedBudget, hostedBy: defaultUser._id}); 
    checkDeletableSharedBudgetSpy.mockResolvedValue(true);
    jest.spyOn(SharedBudgetParticipation, "deleteMany").mockResolvedValue(null);
    jest.spyOn(SharedBudget, "findOneAndDelete").mockResolvedValue({...mockSharedBudget, hostedBy: defaultUser._id});

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual('Deleted successfully');
    expect(checkDeletableSharedBudgetSpy).toHaveBeenCalledWith(mockSharedBudget._id);
    expect(SharedBudgetParticipation.deleteMany).toHaveBeenCalledWith({ sharedBudget: mockSharedBudget._id }, {session: expect.any(Object)});
    expect(SharedBudget.findOneAndDelete).toHaveBeenCalledWith({ _id: mockSharedBudget._id }, {session: expect.any(Object)});
  });

  it("failed: not host", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue({...mockSharedBudget, hostedBy: "realHostId"}); 

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Only the Host and Admin can delete this shared budget');
    expect(checkDeletableSharedBudgetSpy).not.toHaveBeenCalled();
    expect(SharedBudget.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("failed: not deletable", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(mockSharedBudget); 
    checkDeletableSharedBudgetSpy.mockResolvedValue(false);

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual('Cannot delete this shared budget as there are transactions associated with it');
    expect(checkDeletableSharedBudgetSpy).toHaveBeenCalledWith(mockSharedBudget._id);
    expect(SharedBudget.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("failed: group not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(null);  

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Shared Budget not found');
    expect(checkDeletableSharedBudgetSpy).not.toHaveBeenCalled();
  });

  it("failed: verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });


  it('should handle errors: other errors', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    const error = new Error('Database error');
    (SharedBudget.findById as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to delete shared budget');
  });
});
