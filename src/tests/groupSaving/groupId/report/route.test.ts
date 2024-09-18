import { NextRequest } from "next/server";
import { defaultUser, mockGroupSaving } from "src/tests/support-data";
import { verifyAuth } from "src/lib/authentication";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import { GET } from "src/app/api/groupSaving/[groupId]/report/route";
import { ObjectId } from "mongodb";
import GroupSaving from "src/models/groupSaving/model";
import * as FetchTransactionGroupReportLib from "src/lib/fetchTransactionGroupReport";
import { UserRole } from "src/models/user/interface";
import * as GroupSavingUtils from "src/lib/groupSavingUtils"
import exp from "constants";

// Mock the dependencies
jest.mock("src/models/groupSaving/model", () => ({
  findById: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock("src/lib/fetchTransactionGroupReport", () => ({
  groupReportCategories: jest.fn(),
  groupReportUsers: jest.fn(),
  groupReportTransactions: jest.fn(),
}));
jest.mock("src/lib/groupSavingUtils", () => ({
  verifyMember: jest.fn(),
}));

describe("Test GET group report", () => {
  let groupId = mockGroupSaving._id;
  let apiEndPoint =  `http://localhost:3000/api/groupSaving/${groupId}/report`
  let searchParams: string
  let params = { groupId: groupId }
  const mockCategories = [{ _id: new ObjectId(), name: "Category 1" }];
  const mockUsers = [{ _id: new ObjectId(), username: "User 1" }];
  const mockTransactions = [{ _id: new ObjectId(), amount: 100 }];
  let groupReportCategoriesSpy
  let groupReportUsersSpy
  let groupReportTransactionsSpy
  let verifyMemberSpy

  beforeEach(() => {
    jest.resetAllMocks();
    searchParams = '';
    groupReportCategoriesSpy = jest.spyOn(FetchTransactionGroupReportLib, "groupReportCategories");
    groupReportUsersSpy = jest.spyOn(FetchTransactionGroupReportLib, "groupReportUsers");
    groupReportTransactionsSpy = jest.spyOn(FetchTransactionGroupReportLib, "groupReportTransactions");
    verifyMemberSpy = jest.spyOn(GroupSavingUtils, "verifyMember")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("success: admin + with search params", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving);
    groupReportCategoriesSpy.mockResolvedValue(mockCategories);
    groupReportUsersSpy.mockResolvedValue(mockUsers);
    groupReportTransactionsSpy.mockResolvedValue(mockTransactions);

    searchParams = `?filter=highest`;
    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify({
      information: {
        name: mockGroupSaving.name,
        description: mockGroupSaving.description,
        createdDate: mockGroupSaving.createdDate,
        endDate: mockGroupSaving.endDate,
        concurrentAmount: mockGroupSaving.concurrentAmount,
        amount: mockGroupSaving.amount,
      },
      categories: mockCategories,
      users: mockUsers,
      transactions: mockTransactions,
    })));
    expect(groupReportCategoriesSpy).toHaveBeenCalledWith('savingGroup', groupId);
    expect(groupReportUsersSpy).toHaveBeenCalledWith('savingGroup', groupId);
    expect(groupReportTransactionsSpy).toHaveBeenCalledWith('savingGroup', groupId, 'highest');
    expect(verifyMemberSpy).not.toHaveBeenCalled();

  });

  it("success: role customer + no search params", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(mockGroupSaving);
    verifyMemberSpy.mockResolvedValue(true);
    
    groupReportCategoriesSpy.mockResolvedValue(mockCategories);
    groupReportUsersSpy.mockResolvedValue(mockUsers);
    groupReportTransactionsSpy.mockResolvedValue(mockTransactions);

    searchParams = '';
    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify({
      information: {
        name: mockGroupSaving.name,
        description: mockGroupSaving.description,
        createdDate: mockGroupSaving.createdDate,
        endDate: mockGroupSaving.endDate,
        concurrentAmount: mockGroupSaving.concurrentAmount,
        amount: mockGroupSaving.amount,
      },
      categories: mockCategories,
      users: mockUsers,
      transactions: mockTransactions,
    })));
    expect(groupReportCategoriesSpy).toHaveBeenCalledWith('savingGroup', groupId);
    expect(groupReportUsersSpy).toHaveBeenCalledWith('savingGroup', groupId);
    expect(groupReportTransactionsSpy).toHaveBeenCalledWith('savingGroup', groupId, 'latest');
    expect(verifyMemberSpy).toHaveBeenCalledWith(defaultUser._id, groupId);
  });

  
  it("failed: not member", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    verifyMemberSpy.mockResolvedValue(false);

    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params: { groupId: mockGroupSaving._id } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('GroupSavingReport: This user is neither an admin nor a member of the group saving');
    expect(GroupSaving.findById).not.toHaveBeenCalled();
    expect(verifyMemberSpy).toHaveBeenCalledWith(defaultUser._id, mockGroupSaving._id);
  });

  it("failed: group not found", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(null);  

    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('GroupSavingReport: Cannot find GroupSaving');
  });

  it("failed: verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual("GroupSavingReport: " + 'Unauthorized: Token is required in request header');
    expect(GroupSaving.findById).not.toHaveBeenCalled();
  });


  it('should handle errors: other errors', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    const error = new Error('Database error');
    (GroupSaving.findById as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();
    console.log(json.response)

    expect(res.status).toBe(500);
    expect(json.response).toBe("Failed to get report " + error);
  });
});
