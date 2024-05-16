import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { IUser } from "src/models/user/interface";
import User from "src/models/user/model";

// GET: Read the user information
export const GET = async (req: NextRequest, { params }: { params: { username: string } }) => {
  try {
    await connectMongoDB();
    const user = await User.findOne({'username': params.username }).select('-password');
    if (!user) {
      return NextResponse.json({ response: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ response: user }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};

// Check if username exists: return false if no such user exists, true otherwise
async function exist_username(username:string): Promise<boolean>{
  try{
    const query_user = await User.findOne({'username': username}).select('-password');
    if(query_user){
      return true;
    }
    return false;
  } catch (error){
    console.log(error);
    return true;
  }
}

// Check if email exists - we may use phone number in the future
async function exist_email(email:string): Promise<boolean>{
  try{
    const query_user = await User.findOne({'email': email}).select('-password');
    if(query_user){
      return true;
    }
    return false;
  } catch (error){
    console.log(error);
    return true;
  }
}

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
      if (payload.username && payload.username !== user.username && await exist_username(payload.username)) {
        return NextResponse.json({ response: 'This username is used by another account' }, { status: 400 });
      }
      if (payload.email && payload.email !== user.email && await exist_email(payload.email)) {
        return NextResponse.json({ response: 'This email is used by another account' }, { status: 400 });
      }

      const updateQuery: any = {};
      Object.keys(payload).forEach(key => {
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
      // // Update user fields if new values are provided
      // if (newUsername !== undefined && newUsername !== '') {
      //   user.username = newUsername;
      // }
      // if (newEmail !== undefined && newEmail !== '') {
      //   user.email = newEmail;
      // }
      // if (newFullname !== undefined && newFullname !== '') {
      //   user.fullname = newFullname;
      // }
      // if (newPhone !== undefined && newPhone !== '') {
      //   user.phone = newPhone;
      // }
      
      // // Save the updated user object to the database
      // await user.updateOne(payload);
      // // Fetch the data again, omit the password
      // const safeUser = await User.findOne(user._id).select('-password');
      console.log('updatedUser:', updatedUser);
      return NextResponse.json({ response: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ response: 'Cannot update user ' + params.username }, { status: 500 });
  }
};

// DELETE: Delete a user from their username.
export const DELETE = async (req: NextRequest, { params }: { params: { username: string }}) => {
  try {
    await connectMongoDB();
    const username = params.username
    const query_user = await User.findOne({'username': username}).select('-password');
    if(!query_user){
      return NextResponse.json({ response: 'No such user.' }, { status: 400 });
    }
    
    await User.deleteOne({'username': username});
    return NextResponse.json({ response: 'User deleted successfully.' }, { status: 200 });
    
  } catch (error){
    console.error('Error deleting user:', error);
    return NextResponse.json({ response: params.username + ' could not be deleted.' }, { status: 500 });
  }
};