import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from 'src/lib/authentication';
import SharedBudget from 'src/models/sharedBudget/model';
import Transaction from 'src/models/transaction/model';
import { UserRole } from 'src/models/user/interface';
import { GET } from 'src/app/api/sharedBudget/[sharedBudgetId]/transactions/route';
import { defaultUser, mockSharedBudget } from 'src/tests/support-data';
import * as SharedBudgetUtils from 'src/lib/sharedBudgetUtils';
import { TransactionCategory, TransactionType } from 'src/models/transaction/interface';

jest.mock("src/models/sharedBudget/model", () => ({
  findById: jest.fn(),
}));
jest.mock('src/models/transaction/model', () => ({
  aggregate: jest.fn(),
  exec: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock("src/lib/sharedBudgetUtils", () => ({
  verifyMember: jest.fn(),
}));
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
}));

describe('Test GET contribution', () => {
  let groupId = mockSharedBudget._id;
  let apiEndPoint =  `http://localhost:3000/api/sharedBudget/${groupId}/contribution`
  let searchParams: string
  let params = { sharedBudgetId: groupId }
  let verifyMemberSpy

  beforeEach(() => {
    jest.resetAllMocks();
    searchParams = '';
    verifyMemberSpy = jest.spyOn(SharedBudgetUtils, "verifyMember")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('success: admin + with search params', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, 'findById').mockResolvedValue(mockSharedBudget);
    jest.spyOn(Transaction, 'aggregate').mockResolvedValue([]);

    let userId = new ObjectId();
    let from = '2022-01-01';
    let to = '2024-12-31';
    let groupByUser = true
    let type = TransactionType.Expense
    const category = TransactionCategory.Groceries
    const sort = 'ascending'

    let filter = []

    filter.push({ "type": type })
    filter.push({ "category": category })


    let dateFilter : any = {}
    dateFilter['$gte'] = new Date(from)
    dateFilter['$lte'] = new Date(to)
    filter.push({ "createdDate": dateFilter })
    filter.push({ "userId": userId })

    let query = {}
    query['$and'] = filter


    let groupBy = [
        { $group :{
            _id: "$user._id",
            userId: { $first: "$user._id"},
            transactions: { $push: "$$ROOT" }
          }
        }
      ]

    let project = [
        { $project: { _id: 0 }}
      ]

    searchParams = `?groupByUser=${groupByUser}&userId=${userId}&fromDate=${from}&toDate=${to}&type=${type}&category=${category}&sort=${sort}`;
    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toStrictEqual([]);
    expect(verifyMemberSpy).not.toHaveBeenCalled();
    expect(Transaction.aggregate).toHaveBeenCalledWith([
      { $match: { budgetGroupId: new ObjectId(groupId) } },
      { $match: query },
      { $sort: { createdDate: 1 } },
      { $lookup: { 
          from: 'users', 
          localField: 'userId', 
          foreignField: '_id',
          pipeline: [
            { $project: {
                _id: 1,
                username: 1,
                fullname: 1,
                phone: 1,
                tymeReward: 1
              }
            }
          ], 
          as: 'user' 
        } 
      },
      { $unwind : "$user" },
      { $addFields: { 
        byThisUser: { 
          $cond: { 
            if: { $eq: ["$userId", new ObjectId(defaultUser._id)] }, 
            then: "true", 
            else: "false" 
          },
        }
      }
      },
      { $project: { userId: 0 }},
      ...groupBy,
      ...project,
    ])         
  });

  
  it('success: member + no search params', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    verifyMemberSpy.mockResolvedValue(true);
    jest.spyOn(SharedBudget, 'findById').mockResolvedValue(mockSharedBudget);
    jest.spyOn(Transaction, 'aggregate').mockResolvedValue([]);

    let query = {}
    let groupBy = []
    let project = []

    searchParams = ``;
    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toStrictEqual([]);
    expect(verifyMemberSpy).toHaveBeenCalled();
    expect(Transaction.aggregate).toHaveBeenCalledWith([
      { $match: { budgetGroupId: new ObjectId(groupId) } },
      { $match: query },
      { $sort: { createdDate: -1 } },
      { $lookup: { 
          from: 'users', 
          localField: 'userId', 
          foreignField: '_id',
          pipeline: [
            { $project: {
                _id: 1,
                username: 1,
                fullname: 1,
                phone: 1,
                tymeReward: 1
              }
            }
          ], 
          as: 'user' 
        } 
      },
      { $unwind : "$user" },
      { $addFields: { 
        byThisUser: { 
          $cond: { 
            if: { $eq: ["$userId", new ObjectId(defaultUser._id)] }, 
            then: "true", 
            else: "false" 
          },
        }
      }
      },
      { $project: { userId: 0 }},
      ...groupBy,
      ...project,
    ])         
  });

  
  it("failed: verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    searchParams = ``;
    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });


  it('failed: should return 401 if user is not a member or admin', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: {...defaultUser, role: UserRole.Customer}, status: 200 });
    verifyMemberSpy.mockResolvedValue(false);

    searchParams = ``;
    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toBe('This user is neither an admin nor a member of the shared budget' );
    expect(verifyMemberSpy).toHaveBeenCalled();
    expect(SharedBudget.findById).not.toHaveBeenCalled();
  });

  it('failed: should return 404 if shared budget not found', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, 'findById').mockResolvedValue(null);

    searchParams = ``;
    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toBe('Shared Budget not found');
  });

  it('failed: should return 500 if error occurs', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudget, 'findById').mockResolvedValue(mockSharedBudget);
    const error = new Error('Internal server error');
    jest.spyOn(Transaction, "aggregate").mockImplementationOnce(() => { throw error });

    searchParams = ``;
    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to get transactions in group: ' + error);
  });

});