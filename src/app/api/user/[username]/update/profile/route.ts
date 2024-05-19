import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { exist_email, exist_username } from "src/lib/checkExist";
import { usernameValidator } from "src/lib/validator";
import { IUser } from "src/models/user/interface";
import User from "src/models/user/model";

// // Check if username exists: return false if no such user exists, true otherwise
// async function exist_username(username:string): Promise<boolean>{
//   try{
//     const query_user = await User.findOne({'username': username}).select('-password');
//     if(query_user){
//       return true;
//     }
//     return false;
//   } catch (error){
//     console.log(error);
//     return true;
//   }
// }

// // Check if email exists - we may use phone number in the future
// async function exist_email(email:string): Promise<boolean>{
//   try{
//     const query_user = await User.findOne({'email': email}).select('-password');
//     if(query_user){
//       return true;
//     }
//     return false;
//   } catch (error){
//     console.log(error);
//     return true;
//   }
// }

// PUT: update user information
export const PUT = async (req: NextRequest, { params }: { params: { username: string }}) => {
  try {
      // const {newUsername, newEmail, newFullname, newPhone} = payload
      // const user = await User.findOne({'username': username });
      await connectMongoDB();
      const payload = await req.json() as Partial<IUser> //payload = newUser
      const user = await User.findOne({ 'username': params.username }).select('-password');
      if (!user) {
        return NextResponse.json({ response: 'User not found' }, { status: 404 });
      }
      // If username/email is being updated: Check if new username or email already exists
      if (payload.username && payload.username !== user.username) {
        const exist = await exist_username(payload.username)
        if (exist) return NextResponse.json({ response: 'This username is used by another account' }, { status: 400 });
        const validUsername = usernameValidator(payload.username)
        if (!validUsername.status)
          return NextResponse.json({ response: validUsername.message ?? 'Invalid username'}, { status: 400 });
      }
      if (payload.email && payload.email !== user.email && await exist_email(payload.email)) {
        return NextResponse.json({ response: 'This email is used by another account' }, { status: 400 });
      }

      const updateQuery: any = {};
      Object.keys(payload).forEach(key => {
          if (key !== 'password' && key !== 'pin' )
            updateQuery[`${key}`] = payload[key as keyof IUser];
      });

      const updatedUser = await User.findOneAndUpdate(
          { username: params.username },
          { $set: updateQuery },
          {
              new: true,
              runValidators: true,
          }
      );
      console.log('updatedUser:', updatedUser);
      return NextResponse.json({ response: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ response: 'Cannot update user ' + params.username }, { status: 500 });
  }
};
