import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { localDate } from "src/lib/datetime";
import SharedBudget from "src/models/sharedBudget/model";
import { GroupRole } from "src/models/sharedBudgetParticipation/interface";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";

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
    // Initialize default dates
    const currentDate = localDate(new Date());
    const currentDateNextMonth = localDate(new Date());
    currentDateNextMonth.setMonth(currentDateNextMonth.getMonth() + 1);
    
    // Create a new shared budget document
    const newSharedBudget = await SharedBudget.create([{
      hostedBy: user._id,
      name: name,
      description: description,
      amount: amount ?? 0, // initial amount
      concurrentAmount: amount ?? 0, // initial concurrent amount = initial amount  
      createdDate: currentDate,
      endDate: endDate ? localDate(new Date(endDate)) : currentDateNextMonth, // default: ends 1 month from now
      defaultApproveStatus: defaultApproveStatus ?? 'Approved'
    }], {session: dbSession});

    const newParticipation = await SharedBudgetParticipation.create([{
      user: user._id,
      sharedBudget: newSharedBudget[0]._id,
      joinedDate: localDate(new Date()),
      role: GroupRole.Host
    }], {session: dbSession});

    await dbSession.commitTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    return  NextResponse.json({ response: newSharedBudget }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Abort the transaction
    await dbSession.endSession();  // End the session

    console.log("Error creating shared budget: ", error);
    return NextResponse.json({ response: 'Failed to create shared budget: ' + error}, { status: 500 });
  }
};