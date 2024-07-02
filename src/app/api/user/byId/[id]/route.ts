import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyUser, newToken, verifyUserById } from "src/lib/authentication";
import User from "src/models/user/model";

// GET: Read the user information
export const GET = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectMongoDB();
    // Can comment out the verification below to test - it works
    const verification = await verifyUserById(req.headers, params.id)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const user = await User.findOne({ _id: params.id });
    if (!user) {
      return NextResponse.json({ response: "User not found" }, { status: 404 });
    }
    let token = newToken(user)
    // Convert the user document to a plain JavaScript object and remove the password field
    let returnUser = user.toObject();
    delete returnUser.password;
    // return NextResponse.json({ response: { token, user: returnUser } }, { status: 200 });
    return NextResponse.json({ response: returnUser }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message }, { status: 500 });
  }
};
