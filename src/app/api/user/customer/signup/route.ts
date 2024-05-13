import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "../../../../../config/connectMongoDB";
import User from "../../../../../models/user/model";

// Create user
export const POST = async (req: NextRequest) => {
  try {
    await connectMongoDB();
    const payload = await req.json()
    const {username, password, email, fullname, phone } = payload
    const existingUser = await User.findOne({ $or: [{'username': username }, {'email': email }] });
    if (existingUser) {
      return NextResponse.json({response: 'User already exists'}, { status: 400 });
    }
    // Create a new user document
    const newUser = new User({ 
      username: username, 
      phone: phone,
      email: email,
      password: password,
      fullname: fullname
    });
    await newUser.save(); // Save the new user to the database
    return  NextResponse.json({ response: newUser }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};


