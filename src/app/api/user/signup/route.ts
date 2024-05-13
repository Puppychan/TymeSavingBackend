import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { hashPassword } from "src/lib/authentication";
import { passwordValidator } from "src/lib/validator";
import User from "src/models/user/model";

export const POST = async (req: NextRequest) => {
  try {
    await connectMongoDB();
    const payload = await req.json()
    const {username, password, email, fullname, phone } = payload
    const existingUsername = await User.findOne({'username': username });
    const existingMail = await User.findOne({'email': email });
    if (existingUsername) {
      return NextResponse.json({response: 'This username is already used'}, { status: 400 });
    }
    if (existingMail) {
      return NextResponse.json({response: 'This email is already used'}, { status: 400 });
    }

    const validPassword = passwordValidator(password)
    if (!validPassword.status)
      return NextResponse.json({ response: validPassword.message ?? 'Invalid password'}, { status: 400 });

    const hashPw = await hashPassword(password)
    // Create a new user document
    const newUser = new User({ 
      username: username, 
      phone: phone,
      email: email,
      password: hashPw,
      fullname: fullname
    });
    await newUser.save(); // Save the new user to the database
    return  NextResponse.json({ response: newUser }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};
