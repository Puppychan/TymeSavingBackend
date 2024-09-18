import { NextRequest } from "next/server";
import { defaultUser } from "src/tests/support-data";
import { verifyAuth } from "src/lib/authentication";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { GET } from "src/app/api/sharedBudget/byUser/[userId]/route";
import { ObjectId } from "mongodb";
import * as DateTimeLib from "src/lib/datetime";
// Mock the dependencies
jest.mock("src/models/sharedBudgetParticipation/model", () => ({
  aggregate: jest.fn(),
  exec: jest.fn(),
}));
jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));
jest.mock('src/lib/datetime', () => ({
  localDate: jest.fn(),
}));
describe("Test GET groups by user", () => {
  let userId = defaultUser._id;
  let apiEndPoint =  `http://localhost:3000/api/sharedBudget/byUser/${userId}`
  let searchParams: string
  let params = { userId: userId }

  const mockSharedBudgetList = [
    { _id: new ObjectId(), name: "Shared Budget 1" },
    { _id: new ObjectId(), name: "Shared Budget 2" },
  ];

  beforeEach(() => {
    jest.resetAllMocks();
    searchParams = '';
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("success: with search params", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudgetParticipation, "aggregate").mockResolvedValue(mockSharedBudgetList);
    const newDate = new Date();
    jest.spyOn(DateTimeLib, 'localDate').mockReturnValue(newDate);

    let name = 'Group';
    let from = '2022-01-01';
    let to = '2024-12-31';
    let showClosedExpired = false;
    let sort = 'ascending';

    let filter = []
    filter.push({$or: [
      { "sharedBudget.name":{ $regex:'.*' + name + '.*', $options: 'i' } },
      { "user.fullname": { $regex:'.*' + name + '.*', $options: 'i' } }
    ]});

    let dateFilter : any = {}
    dateFilter['$gte'] = new Date(from)
    dateFilter['$lte'] = new Date(to)
    filter.push({ "joinedDate": dateFilter })

    let query = {}
    query['$and'] = filter
    query["sharedBudget.endDate"] = { $gt: newDate };
    query["sharedBudget.isClosed"] = false ;

    searchParams = `?name=${name}&fromDate=${from}&toDate=${to}&sort=ascending&showClosedExpired=${showClosedExpired}&sort=${sort}`;
    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify(mockSharedBudgetList)));
    expect(SharedBudgetParticipation.aggregate).toHaveBeenCalledWith([
      { $match: { user: new ObjectId(userId) } },
      { $lookup: {from: 'sharedbudgets', localField: 'sharedBudget', foreignField: '_id', as: 'sharedBudget'} },
      { $unwind : "$sharedBudget" },
      { $lookup: {from: 'users', localField: 'sharedBudget.hostedBy', foreignField: '_id', as: 'user'} },
      { $unwind : "$user" },
      { 
        $addFields: {
          "sharedBudget.isClosedOrExpired": {
            $or: [
              { $lt: ["$sharedBudget.endDate", newDate] },
              "$sharedBudget.isClosed"
            ]
          },
          "sharedBudget.hostedByFullName": "$user.fullname"
        }
      },
      { $match: query },
      { $sort: { createdDate: 1 } },
      { $replaceRoot: { newRoot: "$sharedBudget" } },
    ]);
  });

  it("success: no search params", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    jest.spyOn(SharedBudgetParticipation, "aggregate").mockResolvedValue(mockSharedBudgetList);
    const newDate = new Date();
    jest.spyOn(DateTimeLib, 'localDate').mockReturnValue(newDate);
    
    let query = {};

    searchParams = '';
    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual(JSON.parse(JSON.stringify(mockSharedBudgetList)));
    expect(SharedBudgetParticipation.aggregate).toHaveBeenCalledWith([
      { $match: { user: new ObjectId(userId) } },
      { $lookup: {from: 'sharedbudgets', localField: 'sharedBudget', foreignField: '_id', as: 'sharedBudget'} },
      { $unwind : "$sharedBudget" },
      { $lookup: {from: 'users', localField: 'sharedBudget.hostedBy', foreignField: '_id', as: 'user'} },
      { $unwind : "$user" },
      { 
        $addFields: {
          "sharedBudget.isClosedOrExpired": {
            $or: [
              { $lt: ["$sharedBudget.endDate", newDate] },
              "$sharedBudget.isClosed"
            ]
          },
          "sharedBudget.hostedByFullName": "$user.fullname"
        }
      },
      { $match: query },
      { $sort: { createdDate: -1 } },
      { $replaceRoot: { newRoot: "$sharedBudget" } },
    ]);
  });

  it("failed: verification FAILED -> should return unauthorized", async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
    expect(SharedBudgetParticipation.aggregate).not.toHaveBeenCalled();
  });


  it('should handle errors: other errors', async () => {
    (verifyAuth as jest.Mock).mockResolvedValue({ response: defaultUser, status: 200 });
    const error = new Error('Database error');
    (SharedBudgetParticipation.aggregate as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = new NextRequest(new URL(apiEndPoint + searchParams));
    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe('Failed to get shared budget list: ' + error);
  });
});
