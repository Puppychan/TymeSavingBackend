import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";

export const GET = async (req: NextRequest, res: NextResponse) => {
    try {
      await connectMongoDB();
      const userList = await User.find();
    //   if (!user) {
    //     return NextResponse.json({ response: 'User not found' }, { status: 404 });
    //   }
  
      return NextResponse.json({ response: userList }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ response: error.message}, { status: 500 });
    }
  };
  