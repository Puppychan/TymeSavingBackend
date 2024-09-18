import { NextRequest } from "next/server";
import { defaultUser, mockSharedBudget } from "src/tests/support-data";
import mongoose from "mongoose";
import SharedBudget from "src/models/sharedBudget/model";
import { verifyAuth } from "src/lib/authentication";
import { UserRole } from "src/models/user/interface";
import { PUT } from "src/app/api/sharedBudget/[sharedBudgetId]/host/edit/route";
// Mock the dependencies
jest.mock("src/models/sharedBudget/model", () => ({
  exec: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock('mongoose', () => ({
  startSession: jest.fn()
}));

describe("Test PUT group", () => {
  let dbSession

  beforeEach(() => {
    jest.resetAllMocks();
    
    dbSession = jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
      startTransaction: jest.fn().mockResolvedValue(null),
      commitTransaction: jest.fn().mockResolvedValue(null),
      abortTransaction: jest.fn().mockResolvedValue(null),
      endSession: jest.fn().mockResolvedValue(null),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("success: role admin", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(mockSharedBudget); 
    jest.spyOn(SharedBudget, "findOneAndUpdate").mockResolvedValue({...mockSharedBudget, description: "update"});

    const req = {json: async () => ({description: "update"})} as NextRequest;
    const res = await PUT(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify({...mockSharedBudget, description: "update"})));
    expect(SharedBudget.findOneAndUpdate).toHaveBeenCalled();
  });

  it("success: role Customer - group's host update endDate", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue({...mockSharedBudget, amount: 1000, concurrentAmount: 1000}); 
    jest.spyOn(SharedBudget, "findOneAndUpdate").mockResolvedValue({...mockSharedBudget, endDate: new Date("2025-01-30"), amount: 100000, concurrentAmount: 100000});

    const req = {json: async () => ({endDate: "2025-01-30", amount: 100000})} as NextRequest;
    const res = await PUT(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify({...mockSharedBudget, endDate: new Date("2025-01-30"), amount: 100000, concurrentAmount: 100000})));
    expect(SharedBudget.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockSharedBudget._id }, { $set: { endDate: new Date("2025-01-30"), amount: 100000, concurrentAmount: 100000} }, { new: true, runValidators: true });
  });

  it("failed: not host", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue({...mockSharedBudget, hostedBy: "realHostId"}); 

    const req = {json: async () => ({description: "update"})} as NextRequest;
    const res = await PUT(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Only the Host and Admin can edit this shared budget');
    expect(SharedBudget.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("failed: group not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(null);  

    const req = {json: async () => ({description: "update"})} as NextRequest;
    const res = await PUT(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Shared Budget not found');
  });

  it("failed: verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = {json: async () => ({description: "update"})} as NextRequest;
    const res = await PUT(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });


  it('should handle errors: other errors', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    const error = new Error('Database error');
    (SharedBudget.findById as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = {} as NextRequest;
    const res = await PUT(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to update shared budget');
  });
});
