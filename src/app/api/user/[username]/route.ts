import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "../../../../config/connectMongoDB";
import User from "../../../../models/user/model";

// read user information
export const GET = async (req: NextRequest, { params }: { params: { username: string } }) => {
  try {
    await connectMongoDB();
    const user = await User.findOne({'username': params.username });
    if (!user) {
      return NextResponse.json({ response: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ response: user }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};
