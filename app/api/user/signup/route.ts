import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "../../../../config/connectMongoDB";
import User from "../../../../models/User";

export const POST = async (req: NextRequest) => {
  try {
      await connectMongoDB();
      const payload = await req.json()
      const {username, phone, email, password} = payload
      const existingUser = await User.findOne({ $or: [{'username': username }, {'user_email': email }] });
        if (existingUser) {
            return new  NextResponse('User already exists', { status: 400 });
        }
        // Create a new user document
        const newUser = new User({ 
          username: username, 
          user_phone: phone,
          user_email: email,
          user_password: password
        });
        await newUser.save(); // Save the new user to the database
        return new  NextResponse(JSON.stringify(newUser), { status: 200 });
  } catch (error: any) {
      return new NextResponse(JSON.stringify(error.message), { status: 500 });
  }
};
