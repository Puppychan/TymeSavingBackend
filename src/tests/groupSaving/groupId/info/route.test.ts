import { NextRequest } from "next/server";
import { defaultUser, mockGroupSaving } from "src/tests/support-data";
import mongoose from "mongoose";
import GroupSaving from "src/models/groupSaving/model";
import * as GroupSavingUtils from "src/lib/groupSavingUtils"
import { verifyAuth } from "src/lib/authentication";
import { GET } from "src/app/api/groupSaving/[groupId]/info/route";
import { UserRole } from "src/models/user/interface";
// Mock the dependencies
jest.mock("src/models/groupSaving/model", () => ({
  aggregate: jest.fn(),
  exec: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock("src/lib/groupSavingUtils", () => ({
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

    verifyMemberSpy = jest.spyOn(GroupSavingUtils, "verifyMember")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("success: role admin", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "aggregate").mockResolvedValue([mockGroupSaving]);  
    // (GroupSaving.aggregate as jest.Mock).mockResolvedValueOnce([mockGroupSaving]);

    const req = {} as NextRequest;
    const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify(mockGroupSaving)));
    expect(GroupSaving.aggregate).toHaveBeenCalled();
    expect(verifyMemberSpy).not.toHaveBeenCalled();
  });

  it("success: role Customer", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    verifyMemberSpy.mockResolvedValue(true);
    jest.spyOn(GroupSaving, "aggregate").mockResolvedValue([mockGroupSaving]);  

    const req = {} as NextRequest;
    const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify(mockGroupSaving)));
    expect(GroupSaving.aggregate).toHaveBeenCalled();
    expect(verifyMemberSpy).toHaveBeenCalledWith(defaultUser._id, mockGroupSaving._id);
  });

  it("failed: not member", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    verifyMemberSpy.mockResolvedValue(false);

    const req = {} as NextRequest;
    const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('This user is neither an admin nor a member of the group saving');
    expect(GroupSaving.aggregate).not.toHaveBeenCalled();
    expect(verifyMemberSpy).toHaveBeenCalledWith(defaultUser._id, mockGroupSaving._id);
  });

  it("should return not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "aggregate").mockResolvedValue([]);  

    const req = {} as NextRequest;
    const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Group Saving not found');
    expect(GroupSaving.aggregate).toHaveBeenCalled();
    expect(verifyMemberSpy).not.toHaveBeenCalledWith();
  });

  it("verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = {} as NextRequest;
    const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });


  it('should handle errors: other errors', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    const error = new Error('Database error');
    (GroupSaving.aggregate as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = {} as NextRequest;
    const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to get group saving: ' + error);
    expect(GroupSaving.aggregate).toHaveBeenCalled();
  });
});
