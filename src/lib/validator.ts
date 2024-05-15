export const usernameValidator = (username: string) => {
  return (username.length >= 8 && username.length <= 15 && (/^[A-Za-z0-9]*$/.test(username)));
}

export interface Validator {
  status: boolean,
  message?: string
}

export const passwordValidator = (password: string) => {
  // min 8 character, max 20 character
  if (password.length < 8 || password.length > 20) 
    return {status: false, message: "Password must be at least 8 characters and at most 20 characters"} as Validator;

  // false if string NOT contain at least one upper case letter & one lower case letter & one digit & one special letter 
  if (!(/[A-Z]/.test(password)))
    return {status: false, message: "Password must contain at least 1 uppercase letter"} as Validator;
  if (!(/[a-z]/.test(password)))
    return {status: false, message: "Password must contain at least 1 lowercase letter"} as Validator;
  if (!(/[0-9]/.test(password)))
    return {status: false, message: "Password must contain at least 1 digit"} as Validator;
  if (!(/[!@#$%^&*]/.test(password)))
    return {status: false, message: "Password must contain at least 1 of the following characters !@#$%^&*"} as Validator;

  // false if string contains other kind of character
  if (!(/^[A-Za-z0-9!@#$%^&*]*$/.test(password))) 
    return {status: false, message: "Password can only be A-Z a-z 0-9 !@#$%^&*"} as Validator;

  return {status: true};
}


