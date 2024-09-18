
import { NextRequest, NextResponse } from 'next/server';
import { GET } from 'src/app/api/groupSaving/viewGroupFromId/[groupId]/route';
import GroupSaving from 'src/models/groupSaving/model';
import GroupSavingParticipation from 'src/models/groupSavingParticipation/model';
import User from 'src/models/user/model';
import { defaultUser, mockGroupSaving } from 'src/tests/support-data';

jest.mock('src/models/groupSaving/model', () => ({
  findById: jest.fn(),
})); 
jest.mock('src/models/groupSavingParticipation/model', () => ({
    countDocuments: jest.fn(),
})); 
jest.mock('src/models/user/model', () => ({
  findById: jest.fn(),
}));

describe('Test GET viewFromGroupId', () => {
  let groupId = mockGroupSaving._id;
  let apiEndPoint =  `http://localhost:3000/api/groupSaving/viewFromGroupId/${groupId}`
  let params = { groupId: groupId }
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


  it('should return 200 and basic group saving information when found', async () => {
    jest.spyOn(GroupSaving, 'findById').mockResolvedValue(mockGroupSaving);
    jest.spyOn(GroupSavingParticipation, 'countDocuments').mockResolvedValue(10);
    jest.spyOn(User, 'findById').mockResolvedValue(defaultUser);

    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.response).toEqual({
      name: mockGroupSaving.name,
      description: mockGroupSaving.description,
      hostUsername: defaultUser.username,
      memberCount: 10,
      createdDate: mockGroupSaving.createdDate.toISOString()
    });
    expect(GroupSaving.findById).toHaveBeenCalledWith(groupId);
    expect(User.findById).toHaveBeenCalledWith(mockGroupSaving.hostedBy);
  });

  it('should return 404 if group saving is not found', async () => {
    jest.spyOn(GroupSaving, 'findById').mockResolvedValue(null);

    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.response).toEqual('Group Saving not found')
  });

  it('should return 500 if there is an error getting the host user', async () => {
    jest.spyOn(GroupSaving, 'findById').mockResolvedValue(mockGroupSaving);
    jest.spyOn(GroupSavingParticipation, 'countDocuments').mockResolvedValue(10);
    jest.spyOn(User, 'findById').mockResolvedValue(null);

    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toEqual('Error with Group Saving: Host not found');
  });

  
  it('should return 500 if there is an error', async () => {
    let error = new Error('Test error');
    jest.spyOn(GroupSaving, 'findById').mockRejectedValue(error);

    const res = await GET(req , { params });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.response).toEqual('Failed to get group info: ' + error);
  });
});