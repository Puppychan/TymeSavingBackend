import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { checkPassword, hashPassword, verifyUser } from "src/lib/authentication";
import { passwordValidator } from "src/lib/validator";
import User from "src/models/user/model";

// Set/update PIN
export const POST = async (req: NextRequest, { params }: { params: { username: string } }) => {
  try {
    await connectMongoDB();
    const verification = await verifyUser(req.headers, params.username)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const payload = await req.json()
    const {newPassword, currentPassword} = payload
    const user = await User.findOne({'username': params.username });
    if (!user) {
      return NextResponse.json({ response: 'User not found' }, { status: 404 });
    }

    // validate new password
    const validPassword = passwordValidator(newPassword)
    if (!validPassword.status)
      return NextResponse.json({ response: validPassword.message}, { status: 400 });

    // check if current password is correct
    const same = await checkPassword(currentPassword, user.password)
    if (!same) {
      return NextResponse.json({ response: 'Cannot update: Password is incorrect' }, { status: 401 });
    }

    // update new password
    const hashPw = await hashPassword(newPassword)
    const  updatedUser = await User.findOneAndUpdate(
        { username: params.username },
        { $set: {password: hashPw} },
        { new: true }
      );
    return NextResponse.json({ response: `Password is updated successfully` }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};