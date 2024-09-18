import { NextRequest } from "next/server";
import { defaultUser, mockSharedBudget } from "src/tests/support-data";
import SharedBudget from "src/models/sharedBudget/model";
import * as SharedBudgetUtils from "src/lib/sharedBudgetUtils"
import { verifyAuth } from "src/lib/authentication";
import { GET } from "src/app/api/sharedBudget/[sharedBudgetId]/member-list/route";
import { UserRole } from "src/models/user/interface";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { exec } from "child_process";
import { populate } from "dotenv";
import { Query } from "mongoose";
// Mock the dependencies
jest.mock("src/models/sharedBudget/model", () => ({
  findById: jest.fn(),
}));
jest.mock("src/models/sharedBudgetParticipation/model", () => ({
  find: jest.fn(() => ({
    populate: jest.fn()
  })),
  exec: jest.fn()
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock("src/lib/sharedBudgetUtils", () => ({
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
    verifyMemberSpy = jest.spyOn(SharedBudgetUtils, "verifyMember")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("success: role admin", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(mockSharedBudget);  
    jest.spyOn(SharedBudgetParticipation, 'find').mockReturnThis()
    .mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockMembers),
    } as any);

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();
    // console.log(json);

    expect(res.status).toBe(200);
    expect(json.response).toEqual(mockMembers);
    expect(verifyMemberSpy).not.toHaveBeenCalled();
    expect(SharedBudget.findById).toHaveBeenCalledWith(mockSharedBudget._id );
  });

  it("success: role Customer", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    verifyMemberSpy.mockResolvedValue(true);
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(mockSharedBudget);
    jest.spyOn(SharedBudgetParticipation, 'find').mockReturnThis()
    .mockReturnValue({
        populate: jest.fn().mockResolvedValueOnce(mockMembers),
    } as any);

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(mockMembers);
    expect(verifyMemberSpy).toHaveBeenCalledWith(defaultUser._id, mockSharedBudget._id);
    expect(SharedBudget.findById).toHaveBeenCalledWith(mockSharedBudget._id );

  });

  it("failed: not member", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    verifyMemberSpy.mockResolvedValue(false);

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('This user is neither an admin nor a member of the shared budget');
    expect(verifyMemberSpy).toHaveBeenCalledWith(defaultUser._id, mockSharedBudget._id);
    expect(SharedBudget.findById).not.toHaveBeenCalled();
  });

  it("failed: group not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(null);  

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Shared Budget not found');
    expect(SharedBudget.findById).toHaveBeenCalled();
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
    (SharedBudget.findById as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = {} as NextRequest;
    const res = await GET(req , { params: { sharedBudgetId: mockSharedBudget._id } });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to get member list');
  });
});
