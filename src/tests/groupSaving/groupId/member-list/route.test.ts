import { NextRequest } from "next/server";
import { defaultUser, mockGroupSaving } from "src/tests/support-data";
import mongoose from "mongoose";
import GroupSaving from "src/models/groupSaving/model";
import * as GroupSavingUtils from "src/lib/groupSavingUtils"
import { verifyAuth } from "src/lib/authentication";
import { GET } from "src/app/api/groupSaving/[groupId]/member-list/route";
import { UserRole } from "src/models/user/interface";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
// Mock the dependencies
jest.mock("src/models/groupSaving/model", () => ({
  findById: jest.fn(),
}));
jest.mock("src/models/groupSavingParticipation/model", () => ({
  find: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock("src/lib/groupSavingUtils", () => ({
  verifyMember: jest.fn(),
}));

describe("Test GET group info", () => {
  let verifyMemberSpy
  const mockMembers = [
    { _id: "userId1", username: "Member 1" },
    { _id: "userId2", username: "Member 2" },
    { _id: defaultUser._id, username: defaultUser.username },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
    verifyMemberSpy = jest.spyOn(GroupSavingUtils, "verifyMember")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // it("success: role admin", async () => {
  //   (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
  //   jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving);  
  //   jest.spyOn(GroupSavingParticipation, "find").mockResolvedValue(mockMembers);

  //   const req = {} as NextRequest;
  //   const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
  //   const json = await res.json();

  //   expect(res.status).toBe(200);
  //   expect(json.response).toEqual(mockMembers);
  //   expect(verifyMemberSpy).not.toHaveBeenCalled();
  //   expect(GroupSaving.findById).toHaveBeenCalledWith(mockGroupSaving._id );
  // });

  // it("success: role Customer", async () => {
  //   (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
  //   verifyMemberSpy.mockResolvedValue(true);
  //   jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving);
  //   jest.spyOn(GroupSavingParticipation, "find").mockResolvedValue(mockMembers);

  //   const req = {} as NextRequest;
  //   const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
  //   const json = await res.json();

  //   expect(res.status).toBe(200);
  //   expect(json.response).toEqual(mockMembers);
  //   expect(verifyMemberSpy).toHaveBeenCalledWith(defaultUser._id, mockGroupSaving._id);
  //   expect(GroupSaving.findById).toHaveBeenCalledWith(mockGroupSaving._id );

  // });

  it("failed: not member", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    verifyMemberSpy.mockResolvedValue(false);

    const req = {} as NextRequest;
    const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('This user is neither an admin nor a member of the group saving');
    expect(verifyMemberSpy).toHaveBeenCalledWith(defaultUser._id, mockGroupSaving._id);
    expect(GroupSaving.findById).not.toHaveBeenCalled();
  });

  it("failed: group not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(null);  

    const req = {} as NextRequest;
    const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Group Saving not found');
    expect(GroupSaving.findById).toHaveBeenCalled();
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
    (GroupSaving.findById as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = {} as NextRequest;
    const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to get member list');
  });
});
