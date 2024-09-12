import { NextRequest } from "next/server";
import { defaultUser, mockGroupSaving } from "src/tests/support-data";
import mongoose from "mongoose";
import GroupSaving from "src/models/groupSaving/model";
import * as GroupSavingUtils from "src/lib/groupSavingUtils"
import { verifyAuth } from "src/lib/authentication";
import { UserRole } from "src/models/user/interface";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import { DELETE } from "src/app/api/groupSaving/[groupId]/host/delete/route";
// Mock the dependencies
jest.mock("src/models/groupSaving/model", () => ({
  exec: jest.fn(),
  findById: jest.fn(),
  findOneAndDelete: jest.fn(),
}));
jest.mock("src/models/groupSavingParticipation/model", () => ({
  deleteMany: jest.fn(),
  exec: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock("src/lib/groupSavingUtils", () => ({
  checkDeletableGroupSaving: jest.fn(),
}));
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
  Types: {
    ObjectId: jest.fn().mockReturnValue('mockedObjectId'),
  },
}));

describe("Test DELETE group", () => {
  let dbSession
  let checkDeletableGroupSavingSpy

  beforeEach(() => {
    jest.resetAllMocks();
    
    dbSession = jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
      startTransaction: jest.fn().mockResolvedValue(null),
      commitTransaction: jest.fn().mockResolvedValue(null),
      abortTransaction: jest.fn().mockResolvedValue(null),
      endSession: jest.fn().mockResolvedValue(null),
    } as any);

    checkDeletableGroupSavingSpy = jest.spyOn(GroupSavingUtils, "checkDeletableGroupSaving")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("success: role admin", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving); 
    jest.spyOn(GroupSavingParticipation, "deleteMany").mockResolvedValue(null);
    jest.spyOn(GroupSaving, "findOneAndDelete").mockResolvedValue(mockGroupSaving);
    checkDeletableGroupSavingSpy.mockResolvedValue(true);

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual('Deleted successfully');
    expect(checkDeletableGroupSavingSpy).toHaveBeenCalledWith(mockGroupSaving._id);
    expect(GroupSavingParticipation.deleteMany).toHaveBeenCalledWith({ groupSaving: mockGroupSaving._id }, {session: expect.any(Object)});
    expect(GroupSaving.findOneAndDelete).toHaveBeenCalledWith({ _id: mockGroupSaving._id }, {session: expect.any(Object)});
  });

  it("success: role Customer - group's host", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue({...mockGroupSaving, hostedBy: defaultUser._id}); 
    checkDeletableGroupSavingSpy.mockResolvedValue(true);
    jest.spyOn(GroupSavingParticipation, "deleteMany").mockResolvedValue(null);
    jest.spyOn(GroupSaving, "findOneAndDelete").mockResolvedValue({...mockGroupSaving, hostedBy: defaultUser._id});

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual('Deleted successfully');
    expect(checkDeletableGroupSavingSpy).toHaveBeenCalledWith(mockGroupSaving._id);
    expect(GroupSavingParticipation.deleteMany).toHaveBeenCalledWith({ groupSaving: mockGroupSaving._id }, {session: expect.any(Object)});
    expect(GroupSaving.findOneAndDelete).toHaveBeenCalledWith({ _id: mockGroupSaving._id }, {session: expect.any(Object)});
  });

  it("failed: not host", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue({...mockGroupSaving, hostedBy: "realHostId"}); 

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Only the Host and Admin can edit this group saving');
    expect(checkDeletableGroupSavingSpy).not.toHaveBeenCalled();
    expect(GroupSaving.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("failed: not deletable", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving); 
    checkDeletableGroupSavingSpy.mockResolvedValue(false);

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual('Cannot delete this group saving as there are transactions associated with it');
    expect(checkDeletableGroupSavingSpy).toHaveBeenCalledWith(mockGroupSaving._id);
    expect(GroupSaving.findOneAndDelete).not.toHaveBeenCalled();
  });

  it("failed: group not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(null);  

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Group Saving not found');
    expect(checkDeletableGroupSavingSpy).not.toHaveBeenCalled();
  });

  it("failed: verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });


  it('should handle errors: other errors', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    const error = new Error('Database error');
    (GroupSaving.findById as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = {} as NextRequest;
    const res = await DELETE(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to delete group saving');
  });
});
