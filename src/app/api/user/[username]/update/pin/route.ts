import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyUser } from "src/lib/authentication";
import { pinValidator } from "src/lib/validator";
import User from "src/models/user/model";
import { startSession } from "mongoose";

// Set/update PIN
export const POST = async (req: NextRequest, { params }: { params: { username: string } }) => {
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();
  try {
    const verification = await verifyUser(req.headers, params.username)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

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

    const validPin = pinValidator(newPIN)
    if (!validPin.status)
      return NextResponse.json({ response: validPin.message }, { status: 400 });
    
    const  updatedUser = await User.findOneAndUpdate(
        { username: params.username },
        { $set: {pin: newPIN} },
        { new: true }
      );
    
    await dbSession.commitTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session
    return NextResponse.json({ response: `New PIN is set successfully: ${updatedUser.pin}` }, { status: 200 });

  } catch (error: any) {
    await dbSession.abortTransaction();  // Abort the transaction
    await dbSession.endSession();  // End the session
    return NextResponse.json({ response: error.message}, { status: 500 });
  }
};