export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { newToken } from "src/lib/authentication";
import User from "src/models/user/model";


// GET: Read the shortened user information - used when viewed by other users
export const GET = async (
  req: NextRequest,
  { params }: { params: { username: string } }
) => {
  try {
    await connectMongoDB();
    const username = params.username;
    const user = await User.findOne({ username: username });
    if (!user) {
      return NextResponse.json({ response: "User not found" }, { status: 404 });
    }
    // May pass sharedBudgetId or groupSavingId to view this user's contribution
    let urlSearchParams = req.nextUrl.searchParams;
    let vnpParams: { [key: string]: string } = {};
    urlSearchParams.forEach((value, key) => {
      vnpParams[key] = value;
    });
    // Convert the user document to a plain JavaScript object and remove the password field
    let objectUser = user.toObject();
    let returnUser = {
      _id: objectUser._id,
      username: objectUser.username,
      email: objectUser.email,
      phone: objectUser.phone,
      fullname: objectUser.fullname,
    } as any;

    return NextResponse.json({ response: returnUser }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message }, { status: 500 });
  }
};

