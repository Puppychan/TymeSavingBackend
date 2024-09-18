import { NextRequest } from "next/server";
import { defaultUser, mockSharedBudget, mockSharedBudgetParticipation } from "../support-data";
import * as AuthLib from "src/lib/authentication"
import mongoose from "mongoose";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { localDate } from "src/lib/datetime";
import { POST } from "src/app/api/sharedBudget/route";
import { ApproveStatuses } from "src/models/sharedBudget/interface";

// Mock the dependencies
jest.mock("src/models/sharedBudget/model", () => ({
  create: jest.fn(),
}));
jest.mock("src/models/sharedBudgetParticipation/model", () => ({
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

    let expectedNewGroup = {...mockSharedBudget, endDate: localDate(new Date(mockSharedBudget.endDate)), createdDate: localDate(new Date())}
    let expectedNewGroupParticipation = {...mockSharedBudgetParticipation, joinedDate: localDate(new Date())}
    
    jest.spyOn(SharedBudget, "create").mockResolvedValue([expectedNewGroup]);
    jest.spyOn(SharedBudgetParticipation, "create").mockResolvedValue([expectedNewGroupParticipation]);

    const req = {
      json: async () => (mockSharedBudget),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response[0]).toEqual( JSON.parse(JSON.stringify(expectedNewGroup)));
    expect(SharedBudget.create).toHaveBeenCalled();
    expect(SharedBudgetParticipation.create).toHaveBeenCalled();
  });

  it("success: missing input is replaced with default", async () => {
    jest.spyOn(AuthLib, "verifyAuth").mockResolvedValue({ response: defaultUser, status: 200 })

    let expectedEndDate = localDate(new Date());
    expectedEndDate.setMonth(expectedEndDate.getMonth() + 1);
    let expectedNewGroup = {...mockSharedBudget, amount: 0, concurrentAmount: 0, defaultApproveStatus: ApproveStatuses.Approved, endDate: expectedEndDate, createdDate: localDate(new Date())}
    let expectedNewGroupParticipation = {...mockSharedBudgetParticipation, joinedDate: localDate(new Date())}
    
    jest.spyOn(SharedBudget, "create").mockResolvedValue([expectedNewGroup]);
    jest.spyOn(SharedBudgetParticipation, "create").mockResolvedValue([expectedNewGroupParticipation]);

    const req = {
      json: async () => ({...mockSharedBudget, amount: undefined, concurrentAmount: undefined, defaultApproveStatus: undefined, endDate: undefined}),
    } as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response[0]).toEqual( JSON.parse(JSON.stringify(expectedNewGroup)));
    expect(SharedBudget.create).toHaveBeenCalled();
    expect(SharedBudgetParticipation.create).toHaveBeenCalled();
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
    (SharedBudget.create as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = { json: async () => mockSharedBudget} as NextRequest;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to create shared budget: ' + error);
  });

  
});
