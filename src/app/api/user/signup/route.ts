import { TymeRewardLevel, UserRole } from './../../../../models/user/interface';
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { hashPassword } from "src/lib/authentication";
import { passwordValidator, usernameValidator } from "src/lib/validator";
import User from "src/models/user/model";
import { startSession } from 'mongoose';

export const POST = async (req: NextRequest) => {
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();
  try {
    const payload = await req.json()
    const {username, password, email, fullname, phone } = payload;

    const existingUsername = await User.findOne({'username': username });
    const existingMail = await User.findOne({'email': email });
    if (existingUsername) {
      return NextResponse.json({response: `This username is already used ${existingUsername._id}${existingUsername.username}`}, { status: 400 });
    }
    if (existingMail) {
      return NextResponse.json({response: 'This email is already used'}, { status: 400 });
    }

    const validUsername = usernameValidator(username)
    if (!validUsername.status) 
      return NextResponse.json({ response: validUsername.message }, { status: 400 });

    const validPassword = passwordValidator(password)
    if (!validPassword.status)
      return NextResponse.json({ response: validPassword.message }, { status: 400 });

    const hashPw = await hashPassword(password)
    // Create a new user document
    const newUser = await User.create([{
      role: UserRole.Customer,
      username: username, 
      phone: phone,
      email: email,
      password: hashPw,
      fullname: fullname,
      userPoints: 0,
      tymeReward: TymeRewardLevel.Classic,
    }], {session: dbSession});

    let returnUser = newUser[0].toObject();
    delete returnUser.password;

    await dbSession.commitTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session
    return NextResponse.json({ response: returnUser }, { status: 200 });
  } catch (error: any) {
    console.log("signup error", error)
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};
