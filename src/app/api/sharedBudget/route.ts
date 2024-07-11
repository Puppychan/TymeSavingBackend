import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import SharedBudget from "src/models/sharedBudget/model";
import { GroupRole } from "src/models/sharedBudgetParticipation/interface";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";

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

    // Create a new shared budget document
    const newSharedBudget = await SharedBudget.create([{
      hostedBy: user._id,
      name: name,
      description: description,
      amount: amount,
      concurrentAmount: amount ?? 0, // initial concurrent amount = amount  
      endDate: endDate ? new Date(endDate) : null,
      createdDate: Date.now()
    }], {session: dbSession});

    const newParticipation = await SharedBudgetParticipation.create([{
      user: user._id,
      sharedBudget: newSharedBudget[0]._id,
      joinedDate: Date.now(),
      role: GroupRole.Host
    }], {session: dbSession});

    await dbSession.commitTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    return  NextResponse.json({ response: newSharedBudget }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    console.log("Error creating shared budget: ", error);
    return NextResponse.json({ response: 'Failed to create shared budget'}, { status: 500 });
  }
};