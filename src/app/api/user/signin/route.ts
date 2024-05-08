import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import User from "src/models/User";

export const POST = async (req: NextRequest) => {
  try {
      await connectMongoDB();
      const payload = await req.json()
      const {username, password} = payload
      const user = await User.findOne({'username': username }, {'password': password });
      if (!user) {
        return new  NextResponse(JSON.stringify('Login credentials invalid'), { status: 404 });
      }

      return new  NextResponse(JSON.stringify('Login successfully'), { status: 200 });
  } catch (error: any) {
      return new NextResponse(error.message, { status: 500 });
  }
};
