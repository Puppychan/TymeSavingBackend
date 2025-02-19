export interface Validator {
  status: boolean,
  message?: string
}

// export const usernameValidator = (username: string) => {
//   return (username.length >= 8 && username.length <= 15 && (/^[A-Za-z0-9_]*$/.test(username)));
// }

export const usernameValidator = (username: string) : Validator =>  {
  // min 5 character, max 15 character
  if (username.length < 5 || username.length > 15) 
    return {status: false, message: "Username must be at least 5 characters and at most 15 characters"};

  // false if string contains other kind of character
  if (!(/^[A-Za-z0-9_]*$/.test(username))) 
    return {status: false, message: "Username can only be A-Z a-z 0-9 _"};

  return {status: true};
}

export const passwordValidator = (password: string) : Validator => {
  // min 8 character, max 20 character
  if (password.length < 8 || password.length > 20) 
    return {status: false, message: "Password must be at least 8 characters and at most 20 characters"};

  // false if string NOT contain at least one upper case letter & one lower case letter & one digit & one special letter 
  if (!(/[A-Z]/.test(password)))
    return {status: false, message: "Password must contain at least 1 uppercase letter"};
  if (!(/[a-z]/.test(password)))
    return {status: false, message: "Password must contain at least 1 lowercase letter"};
  if (!(/[0-9]/.test(password)))
    return {status: false, message: "Password must contain at least 1 digit"};
  if (!(/[!@#$%^&*]/.test(password)))
    return {status: false, message: "Password must contain at least 1 of the following characters !@#$%^&*"};

  // false if string contains other kind of character
  if (!(/^[A-Za-z0-9!@#$%^&*]*$/.test(password))) 
    return {status: false, message: "Password can only be A-Z a-z 0-9 !@#$%^&*"};

  return {status: true};
}

export const pinValidator = (pin: string) : Validator => {
  // pin must have exactly 4 digits
  if (pin.length !== 4) 
    return {status: false, message: "PIN must have 4 digits"};

  // false if string contains other kind of character
  if (!(/^[0-9]*$/.test(pin))) 
    return {status: false, message: "PIN must contain only numbers"};

  return {status: true};
}


