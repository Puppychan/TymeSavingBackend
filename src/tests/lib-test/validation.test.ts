import { usernameValidator, passwordValidator, Validator } from 'src/lib/validator';

describe('usernameValidator', () => {
  it('should return true for valid username', () => {
    expect(usernameValidator('ValidUser1')).toBe(true);
  });

  it('should return false for username less than 8 characters', () => {
    expect(usernameValidator('Short1')).toBe(false);
  });

  it('should return false for username more than 15 characters', () => {
    expect(usernameValidator('ThisIsAVeryLongUsername')).toBe(false);
  });

  it('should return false for username with invalid characters', () => {
    expect(usernameValidator('Invalid_User')).toBe(false);
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
