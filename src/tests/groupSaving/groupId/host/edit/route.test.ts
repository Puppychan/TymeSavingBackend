import { NextRequest } from "next/server";
import { defaultUser, mockGroupSaving } from "src/tests/support-data";
import mongoose from "mongoose";
import GroupSaving from "src/models/groupSaving/model";
import { verifyAuth } from "src/lib/authentication";
import { UserRole } from "src/models/user/interface";
import { PUT } from "src/app/api/groupSaving/[groupId]/host/edit/route";
// Mock the dependencies
jest.mock("src/models/groupSaving/model", () => ({
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
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving); 
    jest.spyOn(GroupSaving, "findOneAndUpdate").mockResolvedValue({...mockGroupSaving, description: "update"});

    const req = {json: async () => ({description: "update"})} as NextRequest;
    const res = await PUT(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify({...mockGroupSaving, description: "update"})));
    expect(GroupSaving.findOneAndUpdate).toHaveBeenCalled();
  });

  it("success: role Customer - group's host update endDate", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving); 
    jest.spyOn(GroupSaving, "findOneAndUpdate").mockResolvedValue({...mockGroupSaving, endDate: new Date("2025-01-30")});

    const req = {json: async () => ({endDate: "2025-01-30"})} as NextRequest;
    const res = await PUT(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify({...mockGroupSaving, endDate: new Date("2025-01-30")})));
    expect(GroupSaving.findOneAndUpdate).toHaveBeenCalledWith({ _id: mockGroupSaving._id }, { $set: { endDate: new Date("2025-01-30") } }, { new: true, runValidators: true });
  });

  it("failed: not host", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue({...mockGroupSaving, hostedBy: "realHostId"}); 

    const req = {json: async () => ({description: "update"})} as NextRequest;
    const res = await PUT(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Only the Host and Admin can edit this group saving');
    expect(GroupSaving.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("failed: group not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(null);  

    const req = {json: async () => ({description: "update"})} as NextRequest;
    const res = await PUT(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Group Saving not found');
  });

  it("failed: verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = {json: async () => ({description: "update"})} as NextRequest;
    const res = await PUT(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });


  it('should handle errors: other errors', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    const error = new Error('Database error');
    (GroupSaving.findById as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = {} as NextRequest;
    const res = await PUT(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to update group saving');
  });
});
