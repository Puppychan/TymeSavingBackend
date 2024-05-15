import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";

// GET: Read the user information
export const GET = async (req: NextRequest, { params }: { params: { username: string } }) => {
  try {
    await connectMongoDB();
    const user = await User.findOne({'username': params.username }).select('-password');
    console.log("User", user);
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
      else{
          return false;
      }
  } catch (error){
      console.log(error);
      return true;
  }
}

// Check if email exists - we may use phone number in the future
async function exist_email(email:string): Promise<boolean>{
  try{
      const query_user = await User.findOne({'user_email': email}).select('-password');
      if(query_user){
          return true;
      }
      else{
          return false;
      }
  } catch (error){
      console.log(error);
      return true;
  }
}

// PUT: update user information
export const PUT = async (req: NextRequest, { params }: { params: { username: string }}) => {
try {
  const payload = await req.json()
  const username = params.username;
  const {newUsername, newPassword, newEmail, newFullname, newPhone } = payload
  // const user = await User.findOne({'username': username });
  try {
      await connectMongoDB();
      var return_username = username;
      const user = await User.findOne({ 'username': username });
      if (!user) {
          return NextResponse.json({ response: 'User not found' }, { status: 404 });
      }
      // Check if new username or email already exists
      if (newUsername !== undefined && newUsername !== user.username && await exist_username(newUsername)) {
          return [400, 'Invalid new username', newUsername];
      }
      if (newEmail !== undefined && newEmail !== user.email && await exist_email(newEmail)) {
          return [400, 'Invalid new email', newEmail];
      }
      // Update user fields if new values are provided
      if (newUsername !== undefined && newUsername !== '') {
          user.username = newUsername;
          return_username = newUsername;
      }
      if (newEmail !== undefined && newEmail !== '') {
          user.email = newEmail;
      }
      if (newFullname !== undefined && newFullname !== '') {
          user.fullname = newFullname;
      }
      if (newPhone !== undefined && newPhone !== '') {
          user.phone = newPhone;
      }
      if (newPassword !== undefined && newPassword !== '') {
          user.password = newPassword;
      }
      // Save the updated user object to the database
      await user.save();
      // Fetch the data again, omit the password
      const safeUser = await User.findOne(user._id).select('-password');
      // console.log(user);
      return NextResponse.json({ response: safeUser }, { status: 200 });
  } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ response: 'Cannot update user ' + username }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};

// DELETE: Delete a user from their username.
export const DELETE = async (req: NextRequest, { params }: { params: { username: string }}) => {
  try {
      const username = params.username;
      try{
          await connectMongoDB();
          const query_user = await User.findOne({'username': username});
          if(query_user){
              await User.deleteOne({'username': username});
              return NextResponse.json({ response: 'User deleted successfully.' }, { status: 200 });
          }
          else{
              return NextResponse.json({ response: 'No such user.' }, { status: 400 });
          }
      } catch (error){
          console.log(error);
          return NextResponse.json({ response: username + ' could not be deleted.' }, { status: 500 });
      }

  } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ response: 'Error deleting: ' + error }, { status: 500 });
  }
};