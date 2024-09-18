import { NextRequest } from "next/server";
import { defaultUser, mockGroupSaving, mockGroupSavingParticipation2 } from "src/tests/support-data";
import mongoose from "mongoose";
import GroupSaving from "src/models/groupSaving/model";
import * as GroupSavingUtils from "src/lib/groupSavingUtils"
import { verifyAuth } from "src/lib/authentication";
import { UserRole } from "src/models/user/interface";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import { DELETE } from "src/app/api/groupSaving/[groupId]/host/remove-member/route";
import User from "src/models/user/model";
// Mock the dependencies
jest.mock("src/models/user/model", () => ({
  findOne: jest.fn(),
}));
jest.mock("src/models/groupSaving/model", () => ({
  exec: jest.fn(),
  findById: jest.fn(),
}));
jest.mock("src/models/groupSavingParticipation/model", () => ({
  findOneAndDelete: jest.fn(),
  exec: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock("src/lib/groupSavingUtils", () => ({
  checkDeletableGroupSaving: jest.fn(),
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
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving); 
    jest.spyOn(User, "findOne").mockResolvedValue({_id: mockGroupSavingParticipation2.user});
    jest.spyOn(GroupSavingParticipation, "findOneAndDelete").mockResolvedValue(mockGroupSavingParticipation2);

    const req = { json: async () => ({memberId: mockGroupSavingParticipation2.user})} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual('Removed member successfully');
    expect(GroupSavingParticipation.findOneAndDelete).toHaveBeenCalledWith({ groupSaving: mockGroupSaving._id, user: mockGroupSavingParticipation2.user});
    expect(GroupSaving.findById).toHaveBeenCalledWith(mockGroupSaving._id);

  });

  it("success: role Customer - group's host", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue({...mockGroupSaving, hostedBy: defaultUser._id}); 
    jest.spyOn(User, "findOne").mockResolvedValue({_id: mockGroupSavingParticipation2.user});
    jest.spyOn(GroupSavingParticipation, "findOneAndDelete").mockResolvedValue(mockGroupSavingParticipation2);

    const req = { json: async () => ({memberId: mockGroupSavingParticipation2.user})} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual('Removed member successfully');
    expect(GroupSavingParticipation.findOneAndDelete).toHaveBeenCalledWith({ groupSaving: mockGroupSaving._id, user: mockGroupSavingParticipation2.user});
    expect(GroupSaving.findById).toHaveBeenCalledWith(mockGroupSaving._id);
  });

  it("failed: not host", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue({...mockGroupSaving, hostedBy: 'realHost'}); 
    jest.spyOn(User, "findOne").mockResolvedValue({_id: mockGroupSavingParticipation2.user});
    jest.spyOn(GroupSavingParticipation, "findOneAndDelete").mockResolvedValue(mockGroupSavingParticipation2);

    const req = { json: async () => ({memberId: 'memberId'})} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();


    expect(res.status).toBe(401);
    expect(json.response).toEqual('Only the Host and Admin can edit this group saving');
    expect(GroupSavingParticipation.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("failed: host cannot be deleted", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving); 

    const req = { json: async () => ({memberId: defaultUser._id})} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual('Host cannot be removed');
    expect(GroupSavingParticipation.findOneAndDelete).not.toHaveBeenCalled();
  });

  
  it("failed: member not in group", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving); 
    jest.spyOn(User, "findOne").mockResolvedValue({_id: 'memberId'});
    jest.spyOn(GroupSavingParticipation, "findOneAndDelete").mockResolvedValue(null);

    const req = { json: async () => ({memberId: 'memberId'})} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Member not found in the group saving');
    expect(GroupSavingParticipation.findOneAndDelete).toHaveBeenCalled();
  });

  it("failed: member not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving); 
    jest.spyOn(User, "findOne").mockResolvedValue(null);

    const req = { json: async () => ({memberId: 'memberId'})} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Member not found');
    expect(GroupSavingParticipation.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("failed: group not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(null);  

    const req = { json: async () => ({memberId: 'memberId'})} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Group Saving not found');
  });

  it("failed: verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = { json: async () => ({memberId: 'memberId'})} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });


  it('should handle errors: other errors', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    const error = new Error('Database error');
    (GroupSaving.findById as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = { json: async () => ({memberId: 'memberId'})} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to remove member');
  });
});
