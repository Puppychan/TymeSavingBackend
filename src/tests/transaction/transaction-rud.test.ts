// tests/transaction.test.ts

import { GET, PUT, DELETE } from "src/app/api/transaction/[transactionId]/route"; // Adjust import based on your route file
import { NextRequest } from "next/server";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import GroupSaving from "src/models/groupSaving/model";
import SharedBudget from "src/models/sharedBudget/model";
import { defaultTransaction } from "../support-data";
import { verifyAuth } from "src/lib/authentication";

const invalidMongoID = "6e2360a1959ee12545ffe0d8";
describe("/api/transaction", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  test("READ TRANSACTION: Invalid transaction ID", async () => {
    jest.spyOn(Transaction, "findById").mockResolvedValue(null);

    const req = {
      query: { transactionId: invalidMongoID }
    } as unknown as NextRequest;

    const res = await GET(req, { params: { transactionId: invalidMongoID } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual("Transaction not found");
  });
  // tests/transaction.test.ts

  test('UPDATE: Invalid transaction ID', async () => {
    const invalidTransaction = {
      ...defaultTransaction,
      _id: invalidMongoID
    };

    const mockFormData = async () => ({
      getAll: () => [],
      get: (key: string) => {
        return invalidTransaction[key as keyof typeof invalidTransaction] || '';
      }
    });

    const req = {
      formData: mockFormData,
      nextUrl: { pathname: `/api/transaction/${invalidMongoID}` }
    } as unknown as NextRequest;
    const res = await PUT(req, { params: { transactionId: invalidMongoID } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toBe('Transaction not found');
  });

  test("UPDATE TRANSACTION: In Group Saving but Income -> Expense", async () => {
    const invalidTransaction = {
      ...defaultTransaction,
      'budgetGroupId': '',
      type: "Expense"
    };

    jest.spyOn(Transaction, "findOne").mockResolvedValue(invalidTransaction as any);
    jest.spyOn(GroupSaving, "findById").mockResolvedValue({ hostedBy: "user-id" } as any);

    const mockFormData = async () => ({
      getAll: () => [],
      get: (key: string) => {
        return invalidTransaction[key as keyof typeof invalidTransaction] || '';
      }
    });

    const req = {
      formData: mockFormData,
      nextUrl: { pathname: `/api/transaction/${invalidMongoID}` }
    } as unknown as NextRequest;
    const res = await PUT(req, { params: { transactionId: invalidMongoID } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual("Transaction is in Group Saving, cannot change to Expense!");
  });

  test("UPDATE TRANSACTION: In Shared Budget but Expense -> Income", async () => {
    const invalidTransaction = {
      ...defaultTransaction,
      'savingGroupId': '',
      type: "Income",
    };

    jest.spyOn(Transaction, "findOne").mockResolvedValue(invalidTransaction as any);
    jest.spyOn(SharedBudget, "findById").mockResolvedValue({ hostedBy: "user-id" } as any);

    const mockFormData = async () => ({
      getAll: () => [],
      get: (key: string) => {
        return invalidTransaction[key as keyof typeof invalidTransaction] || '';
      }
    });

    const req = {
      formData: mockFormData,
      nextUrl: { pathname: `/api/transaction/${invalidMongoID}` }
    } as unknown as NextRequest;
    const res = await PUT(req, { params: { transactionId: invalidMongoID } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.response).toEqual("Transaction is in Shared Budget, cannot change to Income!");
  });

  test("DELETE TRANSACTION: Invalid transaction ID", async () => {
    const transaction = { ...defaultTransaction, _id: invalidMongoID,
      'savingGroupId':'', 'budgetGroupId': ''
     };

    const req = {
      query: { transactionId: invalidMongoID }
    } as unknown as NextRequest;

    const res = await DELETE(req, { params: { transactionId: invalidMongoID } });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual("No such transaction.");
  });

  test("READ TRANSACTION: Success", async () => {
    const transaction = { ...defaultTransaction, _id: defaultTransaction._id.toString() };
    jest.spyOn(Transaction, "findById").mockResolvedValue(transaction);

    const req = {
        nextUrl: { pathname: `/api/transaction/${defaultTransaction._id}` }
    } as unknown as NextRequest;

    const res = await GET(req, { params: { transactionId: defaultTransaction._id.toString() } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response._id).toEqual(defaultTransaction._id.toString());
  });

  test('UPDATE TRANSACTION: Success', async () => {
    // Mock the existing transaction
    const transaction = { ...defaultTransaction, description: "NEW", 
      'savingGroupId': '', 'budgetGroupId': ''
     };
    jest.spyOn(Transaction, "findOne").mockResolvedValue(transaction as any);
    jest.spyOn(Transaction, "findOneAndUpdate").mockResolvedValue({
        ...transaction,
        description: 'Updated Description',
        'savingGroupId': '', 'budgetGroupId': ''
    } as any);

    // Create a mock request object
    const mockFormData = async () => ({
      getAll: () => [],
      get: (key: string) => {
        return transaction[key as keyof typeof transaction] || '';
      }
    });

    const req = {
      formData: mockFormData,
    } as unknown as NextRequest;
    const res = await PUT(req, { params: { transactionId: defaultTransaction._id.toString() } });
    const json = await res.json();

    // Check the response
    expect(res.status).toBe(200);
    expect(json.response.description).toBe('Updated Description');
  });

  test('DELETE TRANSACTION: Success', async () => {
    // Mock the existing transaction
    const transaction = { ...defaultTransaction, 'savingGroupId': '', 'budgetGroupId': '' };
    jest.spyOn(Transaction, "findOne").mockResolvedValue(transaction as any);
    jest.spyOn(Transaction, "deleteOne").mockResolvedValue({ deletedCount: 1 } as any);

    // Create a mock request object
    const req = {
        json: async () => ({}),  // Not needed for DELETE, but included to match interface
    } as unknown as NextRequest;

    // Call the DELETE handler
    const res = await DELETE(req, { params: { transactionId: defaultTransaction._id.toString() } });
    const json = await res.json();

    // Check the response
    expect(res.status).toBe(200);
    expect(json.response).toEqual("Transaction deleted successfully.");
  });

});
