import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import GroupSaving from "src/models/groupSaving/model";
import { GroupRole } from "src/models/groupSavingParticipation/interface";
import GroupSavingParticipation from "src/models/sharedBudgetParticipation/model";

export const POST = async (req: NextRequest) => {
  const dbSession = await startSession();
  dbSession.startTransaction();

  try {
    await connectMongoDB();
    
    const verification = await verifyAuth(req.headers)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const user = verification.response;

    const payload = await req.json()
    const { name, description, amount , endDate } = payload

    // Create a new group saving document
    const newGroup = await GroupSaving.create([{
      hostedBy: user._id,
      name: name,
      description: description,
      amount: amount,
      concurrentAmount: 0,  
      endDate: endDate ? new Date(endDate) : null,
      createdDate: Date.now()
    }], {session: dbSession});

    const newParticipation = await GroupSavingParticipation.create([{
      user: user._id,
      groupSaving: newGroup[0]._id,
      joinedDate: Date.now(),
      role: GroupRole.Host
    }], {session: dbSession});

    await dbSession.commitTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    return  NextResponse.json({ response: newGroup }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    console.log("Error creating group saving: ", error);
    return NextResponse.json({ response: 'Failed to create group saving'}, { status: 500 });
  }
};