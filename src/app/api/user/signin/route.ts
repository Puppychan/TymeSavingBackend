import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";
export const POST = async (req: NextRequest) => {
  try {
    await connectMongoDB();
    const payload = await req.json()
    const {username, password} = payload
    const user = await User.findOne({username: username, password: password });
    console.log(user)
    if (!user) {
      return NextResponse.json({ response: 'Login credentials invalid' }, { status: 404 });
    }

    return NextResponse.json({ response: 'Login successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};
