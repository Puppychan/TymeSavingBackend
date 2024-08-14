import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { localDate } from "src/lib/datetime";
import GroupSaving from "src/models/groupSaving/model";
import { GroupRole } from "src/models/groupSavingParticipation/interface";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";

export const POST = async (req: NextRequest) => {
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();
  
  try {
    
    const verification = await verifyAuth(req.headers)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const user = verification.response;

    const payload = await req.json()
    const { name, description, amount, concurrentAmount, endDate, defaultApproveStatus } = payload

    // Create a new group saving document
    const newGroup = await GroupSaving.create([{
      hostedBy: user._id,
      name: name,
      description: description,
      amount: amount ?? 0,
      concurrentAmount: concurrentAmount ?? 0,  
      endDate: endDate ? new Date(endDate) : null,
      createdDate: localDate(new Date()),
      defaultApproveStatus: defaultApproveStatus ?? 'Approved'
    }], {session: dbSession});

    const newParticipation = await GroupSavingParticipation.create([{
      user: user._id,
      groupSaving: newGroup[0]._id,
      joinedDate: localDate(new Date()),
      role: GroupRole.Host
    }], {session: dbSession});

    await dbSession.commitTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    return  NextResponse.json({ response: newGroup }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Abort the transaction
    await dbSession.endSession();  // End the session

    console.log("Error creating group saving: ", error);
    return NextResponse.json({ response: 'Failed to create group saving'}, { status: 500 });
  }
};