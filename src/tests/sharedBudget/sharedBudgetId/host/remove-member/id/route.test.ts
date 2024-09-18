import { NextRequest } from "next/server";
import { defaultUser, mockSharedBudget, mockSharedBudgetParticipation2 } from "src/tests/support-data";
import mongoose from "mongoose";
import SharedBudget from "src/models/sharedBudget/model";
import * as SharedBudgetUtils from "src/lib/sharedBudgetUtils"
import { verifyAuth } from "src/lib/authentication";
import { UserRole } from "src/models/user/interface";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { DELETE } from "src/app/api/sharedBudget/[sharedBudgetId]/host/remove-member/[id]/route";
import User from "src/models/user/model";
// Mock the dependencies
jest.mock("src/models/user/model", () => ({
  findOne: jest.fn(),
}));
jest.mock("src/models/sharedBudget/model", () => ({
  exec: jest.fn(),
  findById: jest.fn(),
}));
jest.mock("src/models/sharedBudgetParticipation/model", () => ({
  findOneAndDelete: jest.fn(),
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

describe("Test REMOVE member", () => {
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
    jest.spyOn(User, "findOne").mockResolvedValue({_id: mockSharedBudgetParticipation2.user});
    jest.spyOn(SharedBudgetParticipation, "findOneAndDelete").mockResolvedValue(mockSharedBudgetParticipation2);

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id, id: mockSharedBudgetParticipation2.user.toString() } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual('Removed member successfully');
    expect(SharedBudgetParticipation.findOneAndDelete).toHaveBeenCalledWith({ sharedBudget: mockSharedBudget._id, user: mockSharedBudgetParticipation2.user});
    expect(SharedBudget.findById).toHaveBeenCalledWith(mockSharedBudget._id);

  });

  it("success: role Customer - group's host", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue({...mockSharedBudget, hostedBy: defaultUser._id}); 
    jest.spyOn(User, "findOne").mockResolvedValue({_id: mockSharedBudgetParticipation2.user});
    jest.spyOn(SharedBudgetParticipation, "findOneAndDelete").mockResolvedValue(mockSharedBudgetParticipation2);

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id, id: mockSharedBudgetParticipation2.user.toString() } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual('Removed member successfully');
    expect(SharedBudgetParticipation.findOneAndDelete).toHaveBeenCalledWith({ sharedBudget: mockSharedBudget._id, user: mockSharedBudgetParticipation2.user});
    expect(SharedBudget.findById).toHaveBeenCalledWith(mockSharedBudget._id);
  });

  it("failed: not host", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue({...mockSharedBudget, hostedBy: 'realHost'}); 
    jest.spyOn(User, "findOne").mockResolvedValue({_id: mockSharedBudgetParticipation2.user});
    jest.spyOn(SharedBudgetParticipation, "findOneAndDelete").mockResolvedValue(mockSharedBudgetParticipation2);

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id, id: 'memberId' } });
    const json = await res.json();


    expect(res.status).toBe(401);
    expect(json.response).toEqual('Only the Host and Admin can remove a member');
    expect(SharedBudgetParticipation.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("failed: host cannot be deleted", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(mockSharedBudget); 

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id, id: defaultUser._id } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual('Host cannot be removed');
    expect(SharedBudgetParticipation.findOneAndDelete).not.toHaveBeenCalled();
  });

  
  it("failed: member not in group", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(mockSharedBudget); 
    jest.spyOn(User, "findOne").mockResolvedValue({_id: 'memberId'});
    jest.spyOn(SharedBudgetParticipation, "findOneAndDelete").mockResolvedValue(null);

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id, id: 'memberId' } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Member not found in the shared budget');
    expect(SharedBudgetParticipation.findOneAndDelete).toHaveBeenCalled();
  });

  it("failed: member not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(mockSharedBudget); 
    jest.spyOn(User, "findOne").mockResolvedValue(null);

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id, id: 'memberId' } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Member not found');
    expect(SharedBudgetParticipation.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("failed: group not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(null);  

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id, id: 'memberId' } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Shared Budget not found');
  });

  it("failed: verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id, id: 'memberId' } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });


  it('should handle errors: other errors', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    const error = new Error('Database error');
    (SharedBudget.findById as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { sharedBudgetId: mockSharedBudget._id, id: 'memberId' } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to remove member');
  });
});
