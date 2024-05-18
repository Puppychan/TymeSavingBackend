import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import User from "src/models/user/model";

// Set/update PIN
export const POST = async (req: NextRequest, { params }: { params: { username: string } }) => {
  try {
    await connectMongoDB();
    const payload = await req.json()
    const {newPIN, currentPIN} = payload
    const user = await User.findOne({'username': params.username });
    if (!user) {
      return NextResponse.json({ response: 'User not found' }, { status: 404 });
    }

    // if pin is ever set before, check if the current pin is correct
    if (user.pin) {
      if (!currentPIN || (currentPIN && currentPIN !== user.pin))
        return NextResponse.json({ response: `Cannot update: PIN is incorrect` }, { status: 401 }); 
    }

    const  updatedUser = await User.findOneAndUpdate(
        { username: params.username },
        { $set: {pin: newPIN} },
        { new: true }
      );
      return NextResponse.json({ response: `New PIN is set successfully: ${updatedUser.pin}` }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};