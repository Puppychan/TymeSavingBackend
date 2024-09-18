import { NextRequest } from "next/server";
import { defaultUser, mockSharedBudget } from "src/tests/support-data";
import mongoose from "mongoose";
import SharedBudget from "src/models/sharedBudget/model";
import * as SharedBudgetUtils from "src/lib/sharedBudgetUtils"
import { verifyAuth } from "src/lib/authentication";
import { GET } from "src/app/api/sharedBudget/[sharedBudgetId]/info/route";
import { UserRole } from "src/models/user/interface";
// Mock the dependencies
jest.mock("src/models/sharedBudget/model", () => ({
  aggregate: jest.fn(),
  exec: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock("src/lib/sharedBudgetUtils", () => ({
  verifyMember: jest.fn(),
}));
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
  Types: {
    ObjectId: jest.fn().mockReturnValue('mockedObjectId'),
  },
}));


describe("Test GET group info", () => {
  let dbSession
  let verifyMemberSpy

  beforeEach(() => {
    jest.resetAllMocks();
    
    dbSession = jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
      startTransaction: jest.fn().mockResolvedValue(null),
      commitTransaction: jest.fn().mockResolvedValue(null),
      abortTransaction: jest.fn().mockResolvedValue(null),
      endSession: jest.fn().mockResolvedValue(null),
    } as any);

    verifyMemberSpy = jest.spyOn(SharedBudgetUtils, "verifyMember")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("success: role admin", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "aggregate").mockResolvedValue([mockSharedBudget]);  
    // (SharedBudget.aggregate as jest.Mock).mockResolvedValueOnce([mockSharedBudget]);

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify(mockSharedBudget)));
    expect(SharedBudget.aggregate).toHaveBeenCalled();
    expect(verifyMemberSpy).not.toHaveBeenCalled();
  });

  it("success: role Customer", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    verifyMemberSpy.mockResolvedValue(true);
    jest.spyOn(SharedBudget, "aggregate").mockResolvedValue([mockSharedBudget]);  

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify(mockSharedBudget)));
    expect(SharedBudget.aggregate).toHaveBeenCalled();
    expect(verifyMemberSpy).toHaveBeenCalledWith(defaultUser._id, mockSharedBudget._id);
  });

  it("failed: not member", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    verifyMemberSpy.mockResolvedValue(false);

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('This user is neither an admin nor a member of the shared budget');
    expect(SharedBudget.aggregate).not.toHaveBeenCalled();
    expect(verifyMemberSpy).toHaveBeenCalledWith(defaultUser._id, mockSharedBudget._id);
  });

  it("failed: group not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "aggregate").mockResolvedValue([]);  

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Shared Budget not found');
    expect(SharedBudget.aggregate).toHaveBeenCalled();
    expect(verifyMemberSpy).not.toHaveBeenCalledWith();
  });

  it("verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });


  it('should handle errors: other errors', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    const error = new Error('Database error');
    (SharedBudget.aggregate as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to get shared budget: ' + error);
    expect(SharedBudget.aggregate).toHaveBeenCalled();
  });
});
