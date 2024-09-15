import mongoose from 'mongoose';
import { POST } from 'src/app/api/transaction/route';
import { connectMongoDB, disconnectDB } from 'src/config/connectMongoDB';
import Transaction from 'src/models/transaction/model';
import GroupSaving from 'src/models/groupSaving/model';
import SharedBudget from 'src/models/sharedBudget/model';
import { NextRequest } from 'next/server';
import { defaultTransaction, defaultGroupSaving, defaultSharedBudget } from '../support-data';

describe('POST /api/transaction', () => {
  let req: Partial<NextRequest>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  test("CREATE TRANSACTION: Success", async () => {
    // Mock the models
    // Simulate the request body
    const mockFormData = async () => ({
      getAll: () => [],
      get: (key: string) => {
        switch (key) {
          case 'userId': return defaultTransaction.userId;
          case 'description': return defaultTransaction.description;
          case 'type': return defaultTransaction.type;
          case 'amount': return defaultTransaction.amount;
          case 'payBy': return defaultTransaction.payBy;
          case 'category': return defaultTransaction.category;
          case 'approveStatus': return defaultTransaction.approveStatus;
          case 'createdDate': return defaultTransaction.createdDate;
          case 'editedDate': return defaultTransaction.editedDate;
          case 'isMomo': return defaultTransaction.isMomo.toString();
        }
      }
    });

    const req = {
      formData: mockFormData,
    } as unknown as NextRequest;    
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response.userId).toEqual(defaultTransaction.userId);
    expect(json.response.amount).toEqual(defaultTransaction.amount);
  });

  test("CREATE TRANSACTION: Invalid amount", async () => {
    const invalidTransaction = {
      ...defaultTransaction,
      amount: '' // Simulate invalid amount
    };

    const mockFormData = async () => ({
      getAll: () => [],
      get: (key: string) => {
        return invalidTransaction[key as keyof typeof invalidTransaction] || '';
      }
    });

    const req = {
      formData: mockFormData,
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual("Amount must be a valid number");
  });

  test("CREATE TRANSACTION: Invalid shared budget id", async () => {
    jest.spyOn(Transaction.prototype, "save").mockResolvedValue(defaultTransaction as any);
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(null);
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(defaultSharedBudget as any);

    const mockFormData = async () => ({
      getAll: () => [],
      get: (key: string) => {
        if (key === 'savingGroupId') return 'invalidGroupId';
        return defaultTransaction[key as keyof typeof defaultTransaction] || '';
      }
    });

    const req = {
      formData: mockFormData,
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual("No such Group Saving");
  });

  test("CREATE TRANSACTION: Invalid group saving id", async () => {
    jest.spyOn(Transaction.prototype, "save").mockResolvedValue(defaultTransaction as any);
    jest.spyOn(GroupSaving, "findById").mockResolvedValue(defaultGroupSaving as any);
    jest.spyOn(SharedBudget, "findById").mockResolvedValue(null);

    const mockFormData = async () => ({
      getAll: () => [],
      get: (key: string) => {
        if (key === 'budgetGroupId') return 'invalidBudgetGroupId';
        return defaultTransaction[key as keyof typeof defaultTransaction] || '';
      }
    });

    const req = {
      formData: mockFormData,
    } as unknown as NextRequest;

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual("No such Shared Budget");
  });

  test("CREATE TRANSACTION: Internal server error", async () => {
    console.log("=========test 500 ===========")
    // Mock the necessary functions to throw an error
    jest.spyOn(Transaction.prototype, "save").mockImplementation(() => {
      throw new Error("Internal error");
    });

    const mockFormData = async () => ({
      getAll: () => [],
      get: (key: string) => {
        if (key === 'budgetGroupId') return ''
        if (key === 'savingGroupId') return ''
        return defaultTransaction[key as keyof typeof defaultTransaction] || '';
      }
    });

    const req = {
      formData: mockFormData,
    } as unknown as NextRequest;

    // Call the POST function
    const res = await POST(req);
    const json = await res.json();

    // Check if the response status and body match the expected error
    expect(res.status).toBe(500);
    expect(json.response).toEqual("Failed to create transaction: Error: Internal error");
  });
});
