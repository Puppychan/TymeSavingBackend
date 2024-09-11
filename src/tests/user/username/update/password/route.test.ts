
import { verifyUser } from 'src/lib/authentication';
import User from 'src/models/user/model';
import mongoose from 'mongoose';
import { POST } from 'src/app/api/user/[username]/update/password/route';
import { NextRequest } from 'next/server';
import * as AuthLib from 'src/lib/authentication';
import * as ValidationLib from 'src/lib/validator';

// Mock dependencies
jest.mock('src/config/connectMongoDB', () => ({
  connectMongoDB: jest.fn(),
}));

jest.mock('src/lib/authentication', () => ({
  verifyUser: jest.fn(),
  checkPassword: jest.fn(),
  hashPassword: jest.fn(),
}));

jest.mock('src/models/user/model', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));
jest.mock('mongoose', () => ({
  startSession: jest.fn(),
}));

// Test cases
describe('Test UPDATE Password', () => {
  let mockRequest : NextRequest;
  let dbSession
  let passwordValidatorSpy
  let checkPasswordSpy
  let hashPasswordSpy = jest.spyOn(AuthLib, "hashPassword").mockResolvedValue('newHashedPassword')

  beforeEach(() => {
    jest.resetAllMocks();

    dbSession = jest.spyOn(mongoose, 'startSession').mockResolvedValueOnce({ 
      startTransaction: jest.fn().mockResolvedValue(null),
      commitTransaction: jest.fn().mockResolvedValue(null),
      abortTransaction: jest.fn().mockResolvedValue(null),
      endSession: jest.fn().mockResolvedValue(null),
    } as any);

    passwordValidatorSpy = jest.spyOn(ValidationLib, "passwordValidator")
    checkPasswordSpy = jest.spyOn(AuthLib, "checkPassword")
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should update password successfully', async () => {
    // Mock successful authentication, password validation, and update
    (verifyUser as jest.Mock).mockResolvedValue({ status: 200 });
    (User.findOne as jest.Mock).mockResolvedValue({ username: 'testUser', password: 'hashedPassword' });
    (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ username: 'testUser', password: 'newHashedPassword' });
    checkPasswordSpy.mockResolvedValue(true);

    mockRequest = {
      headers: {
        authorization: 'Bearer validToken',
      },
      json: async () => ({
        newPassword: 'strongPassword123@',
        currentPassword: 'correctPassword',
      }),
    } as unknown as NextRequest;
    const response = await POST(mockRequest, { params: { username: 'testUser' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.response).toBe('Password is updated successfully');
    expect(checkPasswordSpy).toHaveBeenCalledWith('correctPassword', 'hashedPassword');
    expect(passwordValidatorSpy).toHaveBeenCalledWith('strongPassword123@');
    expect(hashPasswordSpy).toHaveBeenCalledWith('strongPassword123@');
    expect(User.findOneAndUpdate).toHaveBeenCalled()
  });

  it('should return error for invalid authentication', async () => {
    // Mock failed authentication
    (verifyUser as jest.Mock).mockResolvedValue({response: "Unauthorized: Token is required in request header", status: 401 });

    const response = await POST(mockRequest, { params: { username: 'testUser' } });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.response).toBe('Unauthorized: Token is required in request header');
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('should return error for invalid new password', async () => {
    // Mock successful authentication, password validation, and update
    (verifyUser as jest.Mock).mockResolvedValue({ status: 200 });
    (User.findOne as jest.Mock).mockResolvedValue({ username: 'testUser', password: 'hashedPassword' });
    (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ username: 'testUser', password: 'newHashedPassword' });

    mockRequest = {
      headers: {
        authorization: 'Bearer validToken',
      },
      json: async () => ({
        newPassword: 'invalid',
        currentPassword: 'correctPassword',
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest, { params: { username: 'testUser' } });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.response).toBe('Password must be at least 8 characters and at most 20 characters');
    expect(passwordValidatorSpy).toHaveBeenCalledWith('invalid');
    expect(checkPasswordSpy).not.toHaveBeenCalled();
  });

  it('should return error for incorrect current password', async () => {
    // Mock successful authentication, password validation, and update
    (verifyUser as jest.Mock).mockResolvedValue({ status: 200 });
    (User.findOne as jest.Mock).mockResolvedValue({ username: 'testUser', password: 'hashedPassword' });
    (User.findOneAndUpdate as jest.Mock).mockResolvedValue({ username: 'testUser', password: 'newHashedPassword' });

    mockRequest = {
      headers: {
        authorization: 'Bearer validToken',
      },
      json: async () => ({
        newPassword: 'strongPassword123@',
        currentPassword: 'wrongPassword',
      }),
    } as unknown as NextRequest;

    const response = await POST(mockRequest, { params: { username: 'testUser' } });
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.response).toBe('Cannot update: Password is incorrect');
    expect(passwordValidatorSpy).toHaveBeenCalledWith('strongPassword123@');
    expect(checkPasswordSpy).toHaveBeenCalledWith('wrongPassword', 'hashedPassword');
  });

  it('should return error for user not found', async () => {
    // Mock user not found
    (verifyUser as jest.Mock).mockResolvedValue({ status: 200 });
    (User.findOne as jest.Mock).mockResolvedValue(null);

    const response = await POST(mockRequest, { params: { username: 'testUser' } });
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.response).toBe('User not found');
  });

  it('should handle database errors', async () => {
    // Mock database error
    (verifyUser as jest.Mock).mockResolvedValue({ status: 200 });
    (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

    const response = await POST(mockRequest, { params: { username: 'testUser' } });
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.response).toContain('Database error');
  });
});