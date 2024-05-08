import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "../../../../config/connectMongoDB";
import User from "../../../../models/User";


export const GET = async (req: NextRequest, { params }: { params: { username: string } }) => {
  try {
      await connectMongoDB();
      const user = await User.findOne({'username': params.username });
      if (!user) {
        return new  NextResponse(JSON.stringify('User not found'), { status: 404 });
      }

      return new  NextResponse(JSON.stringify(user), { status: 200 });
  } catch (error: any) {
      return new NextResponse(error.message, { status: 500 });
  }
};
