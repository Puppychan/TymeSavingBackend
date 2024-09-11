import { NextRequest } from "next/server";
import { defaultUser, mockGroupSaving, mockGroupSavingParticipation } from "../support-data";
import * as AuthLib from "src/lib/authentication"
import mongoose from "mongoose";
import GroupSaving from "src/models/groupSaving/model";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import { localDate } from "src/lib/datetime";
import { POST } from "src/app/api/groupSaving/route";
import { ApproveStatuses } from "src/models/groupSaving/interface";

// Mock the dependencies
jest.mock("src/models/groupSaving/model", () => ({
  create: jest.fn(),
}));
jest.mock("src/models/groupSavingParticipation/model", () => ({
  create: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
}));


describe("Test CREATE Group", () => {
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

  it("success: full input", async () => {
    jest.spyOn(AuthLib, "verifyAuth").mockResolvedValue({ response: defaultUser, status: 200 })

    let expectedNewGroup = {...mockGroupSaving, endDate: localDate(new Date(mockGroupSaving.endDate)), createdDate: localDate(new Date())}
    let expectedNewGroupParticipation = {...mockGroupSavingParticipation, joinedDate: localDate(new Date())}
    
    jest.spyOn(GroupSaving, "create").mockResolvedValue([expectedNewGroup]);
    jest.spyOn(GroupSavingParticipation, "create").mockResolvedValue([expectedNewGroupParticipation]);

    const req = {
      json: async () => (mockGroupSaving),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response[0]).toEqual( JSON.parse(JSON.stringify(expectedNewGroup)));
    expect(GroupSaving.create).toHaveBeenCalled();
    expect(GroupSavingParticipation.create).toHaveBeenCalled();
  });

  it("success: missing input is replaced with default", async () => {
    jest.spyOn(AuthLib, "verifyAuth").mockResolvedValue({ response: defaultUser, status: 200 })

    let expectedEndDate = localDate(new Date());
    expectedEndDate.setMonth(expectedEndDate.getMonth() + 1);
    let expectedNewGroup = {...mockGroupSaving, amount: 0, concurrentAmount: 0, defaultApproveStatus: ApproveStatuses.Approved, endDate: expectedEndDate, createdDate: localDate(new Date())}
    let expectedNewGroupParticipation = {...mockGroupSavingParticipation, joinedDate: localDate(new Date())}
    
    jest.spyOn(GroupSaving, "create").mockResolvedValue([expectedNewGroup]);
    jest.spyOn(GroupSavingParticipation, "create").mockResolvedValue([expectedNewGroupParticipation]);

    const req = {
      json: async () => ({...mockGroupSaving, amount: undefined, concurrentAmount: undefined, defaultApproveStatus: undefined, endDate: undefined}),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response[0]).toEqual( JSON.parse(JSON.stringify(expectedNewGroup)));
    expect(GroupSaving.create).toHaveBeenCalled();
    expect(GroupSavingParticipation.create).toHaveBeenCalled();
  });

  it("verification FAILED -> should return unauthorized", async () => {
    jest.spyOn(AuthLib, "verifyAuth").mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = { json: async () => {}} as NextRequest;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });


  it('should handle errors: other errors', async () => {
    jest.spyOn(AuthLib, "verifyAuth").mockResolvedValue({ response:'', status: 200 })
    const error = new Error('Database error');
    (GroupSaving.create as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = { json: async () => mockGroupSaving} as NextRequest;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to create group saving: ' + error);
  });

  
});
