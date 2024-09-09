import { NextRequest } from "next/server";
import { POST } from "src/app/api/groupSaving/route";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
// import { POST } from "src/app/api/financialChallenge/route";
import * as AuthLib from "src/lib/authentication"
import GroupSaving from "src/models/groupSaving/model";
import { UserRole } from "src/models/user/interface";

jest.mock("src/config/connectMongoDB", () => ({
  connectMongoDB: jest.fn().mockResolvedValue(null),
  disconnectDB: jest.fn().mockResolvedValue(null),
}));

// jest.mock("src/lib/authentication", () => ({
//   verifyAuth: jest.fn().mockResolvedValue({ status: 200, response: { _id: "user-id" } }),
// }));

jest.mock("src/lib/authentication", () => ({
  verifyAuth: jest.fn(),
}));

const testGroup = {
  _id: "07d1be44c0380f3696e83722",
  name: "Group - Test",
  description: "Group - Test",
  amount: 10000000,
  endDate: "2024-12-30"
}   

const testUser = {
  _id: "567cedea6bd680f6d9fac54a",
  username: "hakhanhne",
  phone: "0938881145",
  email: "hakhanhne@gmail.com",
  password: undefined,
  fullname: "Khanh Tran",
  role: UserRole.Admin,
  pin: '1234'
};

describe("/api/groupSaving", () => {
  beforeAll(async () => {
    await connectMongoDB();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {  
    await disconnectDB();
  });
    
  test("success", async () => {
    jest.spyOn(AuthLib, "verifyAuth").mockResolvedValue({ response: testUser, status: 200 })

    let req = {
      json: async () => (testGroup),
    } as NextRequest;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response.defaultApproveStatus).toEqual('Approved');
  });

  test("verification FAILED -> should return unauthorized", async () => {
    jest.spyOn(AuthLib, "verifyAuth").mockResolvedValue({ response: 'Unauthorized: Token is required in request header', status: 401 })

    const req = {} as NextRequest;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.response).toEqual('Unauthorized: Token is required in request header');
  });

  test('should handle errors', async () => {
    jest.spyOn(AuthLib, "verifyAuth").mockResolvedValue({ response: '', status: 200 })
    const error = new Error('Database error');
    (GroupSaving.create as jest.Mock).mockImplementationOnce(() => { throw error; });

    const req = {} as NextRequest;
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toBe(error.message);
  });
});
  