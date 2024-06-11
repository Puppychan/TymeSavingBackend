import User from "../models/user/model";

// Check if username exists: return false if no such user exists, true otherwise
export async function exist_username(username:string): Promise<boolean>{
  try{
    const query_user = await User.findOne({'username': username});
    if(query_user){
      return true;
    }
    return false;
  } catch (error){
    return true;
  }
}

// Check if email exists - we may use phone number in the future
export async function exist_email(email:string): Promise<boolean>{
  try{
    const query_user = await User.findOne({'email': email});
    if(query_user){
      return true;
    }
    return false;
  } catch (error){
    console.log(error);
    return true;
  }
}