import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { checkPassword, newToken } from "src/lib/authentication";
import { UserRole } from "src/models/user/interface";
import User from "src/models/user/model";

// body: {username, password}
// response: {token: token, role: role }
export const POST = async (req: NextRequest) => {
  try {
    await connectMongoDB();
    const payload = await req.json()
    const {username, password} = payload
    const user = await User.findOne({username: username});
    if (!user) {
      return NextResponse.json({ response: `Login credentials invalid. No account with username ${username}` }, { status: 401});
    }

    const same = await checkPassword(password, user.password)
    if (!same) {
      return NextResponse.json({ response: 'Login credentials invalid. Wrong password' }, { status: 401 });
    }

    let token = newToken(user);
    // Convert the user document to a plain JavaScript object and remove the password field
    let returnUser = user.toObject();
    delete returnUser.password;
    return NextResponse.json({ response: {token: token, user: returnUser} }, { status: 200 });
  } catch (error: any) {
    console.log(error)
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};
