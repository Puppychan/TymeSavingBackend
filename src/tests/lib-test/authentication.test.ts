import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { hashPassword, checkPassword, newToken, verifyToken, verifyUser } from 'src/lib/authentication';
import { defaultUser } from '../support-data';
import User from 'src/models/user/model';
import { UserRole } from 'src/models/user/interface';

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    test('should hash the password successfully', async () => {
      (bcrypt.genSalt as jest.Mock).mockImplementation((rounds, callback) => {
        callback(null, 'salt');
      });
      (bcrypt.hash as jest.Mock).mockImplementation((password, salt, callback) => {
        callback(null, 'hashedPassword');
      });

      const result = await hashPassword('password');
      expect(result).toBe('hashedPassword');
      expect(bcrypt.genSalt).toHaveBeenCalledWith(12, expect.any(Function));
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 'salt', expect.any(Function));
    });

    test('should handle errors in genSalt', async () => {
      (bcrypt.genSalt as jest.Mock).mockImplementation((rounds, callback) => {
        callback(new Error('genSalt error'), null);
      });

      await expect(hashPassword('password')).rejects.toThrow('genSalt error');
    });

    test('should handle errors in hash', async () => {
      (bcrypt.genSalt as jest.Mock).mockImplementation((rounds, callback) => {
        callback(null, 'salt');
      });
      (bcrypt.hash as jest.Mock).mockImplementation((password, salt, callback) => {
        callback(new Error('hash error'), null);
      });

      await expect(hashPassword('password')).rejects.toThrow('hash error');
    });
  });

  describe('checkPassword', () => {
    test('should check the password successfully', async () => {
      (bcrypt.compare as jest.Mock).mockImplementation((password, hash, callback) => {
        callback(null, true);
      });

      const result = await checkPassword('password', 'hashedPassword');
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword', expect.any(Function));
    });

    test('should handle errors in compare', async () => {
      (bcrypt.compare as jest.Mock).mockImplementation((password, hash, callback) => {
        callback(new Error('compare error'), null);
      });

      await expect(checkPassword('password', 'hashedPassword')).rejects.toThrow('compare error');
    });
  });

  describe('newToken', () => {
    test('should create a new token', () => {
      (jwt.sign as jest.Mock).mockReturnValue('token');

      const user = { _id: 'userId' };
      const result = newToken(user);
      expect(result).toBe('token');
      expect(jwt.sign).toHaveBeenCalledWith({ id: user._id }, '12345-67890-09876-54321', { expiresIn: '3d' });
    });
  });

  describe('verifyToken', () => {
    test('should verify the token successfully', async () => {
      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(null, { id: 'userId' });
      });

      const result = await verifyToken('token');
      expect(result).toEqual({ id: 'userId' });
      expect(jwt.verify).toHaveBeenCalledWith('token', '12345-67890-09876-54321', expect.any(Function));
    });

    test('should handle errors in verify', async () => {
      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(new Error('verify error'), null);
      });

      await expect(verifyToken('token')).rejects.toThrow('verify error');
    });
  });

  describe('verifyUser', () => {
    test('should verify user successfully', async () => {
      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(null, { id: 'userId' });
      });
      jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);

      const headers = new Headers()
      headers.append("Authorization", "Bear valid_token")
      const result = await verifyUser(headers, defaultUser.username);
      expect(result.status).toBe(200)
      expect(result.response).toEqual({...defaultUser, password: undefined})
    });

    test('no authorization header', async () => {
      const headers = new Headers()
      const result = await verifyUser(headers, defaultUser.username);
      expect(result.status).toBe(401)
      expect(result.response).toBe("Unauthorized: Token is required in request header")
    });

    test('user not found with given token', async () => {
      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(null, { id: 'userId' });
      });
      jest.spyOn(User, "findOne").mockResolvedValue(null);

      const headers = new Headers()
      headers.append("Authorization", "Bear valid_token")
      const result = await verifyUser(headers, defaultUser.username);
      expect(result.status).toBe(401)
      expect(result.response).toBe("Unauthorized: User not found")
    });


    test('forbidden action', async () => {
      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(null, { id: 'userId' });
      });
      jest.spyOn(User, "findOne").mockResolvedValue({...defaultUser, role: UserRole.Customer});

      const headers = new Headers()
      headers.append("Authorization", "Bear valid_token")
      const result = await verifyUser(headers, "someuser");
      console.log(result)
      expect(result.status).toBe(403)
      expect(result.response).toBe("Forbidden action")
    });

    test('should handle errors in verify', async () => {
      (jwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(new Error('invalid token'), null);
      });
      // jest.spyOn(User, "findOne").mockResolvedValue(defaultUser);

      const headers = new Headers()
      headers.append("Authorization", "Bear invalid_token")
      const result = await verifyUser(headers, defaultUser.username);
      expect(result.status).toBe(401)
      expect(result.response).toBe('Unauthorized: invalid token')
    });
  });
});
