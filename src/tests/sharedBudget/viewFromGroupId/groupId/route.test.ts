
import { NextRequest, NextResponse } from 'next/server';
import { GET } from 'src/app/api/sharedBudget/viewBudgetFromId/[sharedBudgetId]/route';
import SharedBudget from 'src/models/sharedBudget/model';
import SharedBudgetParticipation from 'src/models/sharedBudgetParticipation/model';
import User from 'src/models/user/model';
import { defaultUser, mockSharedBudget } from 'src/tests/support-data';

jest.mock('src/models/sharedBudget/model', () => ({
  findById: jest.fn(),
})); 
jest.mock('src/models/sharedBudgetParticipation/model', () => ({
    countDocuments: jest.fn(),
})); 
jest.mock('src/models/user/model', () => ({
  findById: jest.fn(),
}));

describe('Test GET viewFromGroupId', () => {
  let groupId = mockSharedBudget._id;
  let apiEndPoint =  `http://localhost:3000/api/sharedBudget/viewBudgetFromId/${groupId}`
  let params = { sharedBudgetId: groupId }
  let req: NextRequest;

  beforeEach(() => {
    req = new NextRequest(new URL(apiEndPoint));
  });
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });


  it('should return 200 and basic shared budget information when found', async () => {
    jest.spyOn(SharedBudget, 'findById').mockResolvedValue(mockSharedBudget);
    jest.spyOn(SharedBudgetParticipation, 'countDocuments').mockResolvedValue(10);
    jest.spyOn(User, 'findById').mockResolvedValue(defaultUser);

    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual({
      name: mockSharedBudget.name,
      description: mockSharedBudget.description,
      hostUsername: defaultUser.username,
      memberCount: 10,
      createdDate: mockSharedBudget.createdDate.toISOString()
    });
    expect(SharedBudget.findById).toHaveBeenCalledWith(groupId);
    expect(User.findById).toHaveBeenCalledWith(mockSharedBudget.hostedBy);
  });

  it('should return 404 if shared budget is not found', async () => {
    jest.spyOn(SharedBudget, 'findById').mockResolvedValue(null);

    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Shared Budget not found')
  });

  it('should return 500 if there is an error getting the host user', async () => {
    jest.spyOn(SharedBudget, 'findById').mockResolvedValue(mockSharedBudget);
    jest.spyOn(SharedBudgetParticipation, 'countDocuments').mockResolvedValue(10);
    jest.spyOn(User, 'findById').mockResolvedValue(null);

    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toEqual('Error with Shared Budget: Host not found');
  });

  
  it('should return 500 if there is an error', async () => {
    let error = new Error('Test error');
    jest.spyOn(SharedBudget, 'findById').mockRejectedValue(error);

    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toEqual('Failed to get group info: ' + error);
  });
});