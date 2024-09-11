import { usernameValidator, passwordValidator, Validator, pinValidator } from 'src/lib/validator';

describe('usernameValidator', () => {
  it('should return true for valid username', () => {
    const result = usernameValidator('ValidUser_1');
    expect(result.status).toBe(true);
  });

  it('should return false for username less than 5 characters', () => {
    const result: Validator = usernameValidator('hi');
    expect(result.status).toBe(false);
    expect(result.message).toBe('Username must be at least 5 characters and at most 15 characters');
  });

  it('should return false for username more than 15 characters', () => {
    const result: Validator = usernameValidator('ThisIsAVeryLongUsername');
    expect(result.status).toBe(false);
    expect(result.message).toBe('Username must be at least 5 characters and at most 15 characters');
  });

  it('should return false for username with invalid characters', () => {
    const result: Validator = usernameValidator('Invalid_User@');
    expect(result.status).toBe(false);
    expect(result.message).toBe('Username can only be A-Z a-z 0-9 _');
  });
});

describe('passwordValidator', () => {
  it('should return true for valid password', () => {
    const result: Validator = passwordValidator('Valid1@Password');
    expect(result.status).toBe(true);
  });

  it('should return false for password less than 8 characters', () => {
    const result: Validator = passwordValidator('Short1@');
    expect(result.status).toBe(false);
    expect(result.message).toBe('Password must be at least 8 characters and at most 20 characters');
  });


  it('should return false for password without uppercase letter', () => {
    const result: Validator = passwordValidator('nouppercase1@');
    expect(result.status).toBe(false);
    expect(result.message).toBe('Password must contain at least 1 uppercase letter');
  });

  it('should return false for password without lowercase letter', () => {
    const result: Validator = passwordValidator('NOLOWERCASE1@');
    expect(result.status).toBe(false);
    expect(result.message).toBe('Password must contain at least 1 lowercase letter');
  });

  it('should return false for password without digit', () => {
    const result: Validator = passwordValidator('NoDigit@Password');
    expect(result.status).toBe(false);
    expect(result.message).toBe('Password must contain at least 1 digit');
  });

  it('should return false for password without special character', () => {
    const result: Validator = passwordValidator('NoSpecial1');
    expect(result.status).toBe(false);
    expect(result.message).toBe('Password must contain at least 1 of the following characters !@#$%^&*');
  });

  it('should return false for password with invalid characters', () => {
    const result: Validator = passwordValidator('InvalidChar1@_');
    expect(result.status).toBe(false);
    expect(result.message).toBe('Password can only be A-Z a-z 0-9 !@#$%^&*');
  });
});


describe('pinValidator', () => {
  it('should return true for valid pin', () => {
    const result: Validator = pinValidator('0123');
    expect(result.status).toBe(true);
  });

  it('should return false for not being exactly 4 digits ', () => {
    const result: Validator = pinValidator('12345');
    expect(result.status).toBe(false);
    expect(result.message).toBe('PIN must have 4 digits');
  });


  it('should return false for having other than numbers', () => {
    const result: Validator = pinValidator('123a');
    expect(result.status).toBe(false);
    expect(result.message).toBe('PIN must contain only numbers');
  });
});
