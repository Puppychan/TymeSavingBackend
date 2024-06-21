import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyUser, newToken } from "src/lib/authentication";
import { exist_email, exist_username } from "src/lib/checkExist";
import { usernameValidator } from "src/lib/validator";
import { IUser } from "src/models/user/interface";
import User from "src/models/user/model";

// PUT: update user information (except for password and pin)
export const PUT = async (req: NextRequest, { params }: { params: { username: string }}) => {
  try {
      await connectMongoDB();
      const verification = await verifyUser(req.headers, params.username)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const payload = await req.json() as Partial<IUser> //payload = newUser
      const user = await User.findOne({ 'username': params.username });
      if (!user) {
        return NextResponse.json({ response: 'User not found' }, { status: 404 });
      }
      // If username/email is being updated: Check if new username or email already exists
      if (payload.username && payload.username !== user.username) {
        const exist = await exist_username(payload.username)
        if (exist) return NextResponse.json({ response: 'This username is used by another account' }, { status: 400 });
        const validUsername = usernameValidator(payload.username)
        if (!validUsername.status)
          return NextResponse.json({ response: validUsername.message}, { status: 400 });
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

      let token = newToken(updatedUser);
      // Convert the user document to a plain JavaScript object and remove the password field
      let returnUser = updatedUser.toObject();
      delete returnUser.password;
      // return NextResponse.json({ response: { token, user: returnUser } }, { status: 200 });
      return NextResponse.json({ response: returnUser }, { status: 200 });
  } catch (error: any) {
    console.log('Error updating user:', error);
    return NextResponse.json({ response: 'Cannot update user ' + params.username }, { status: 500 });
  }
};
