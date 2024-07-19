import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { ChallengeCategory, IMemberProgress } from "src/models/financialChallenge/interface";
import FinancialChallenge from "src/models/financialChallenge/model";
import GroupSaving from "src/models/groupSaving/model";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import SharedBudget from "src/models/sharedBudget/model";
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
    const { name, description, category, savingGroupId, budgetGroupId} = payload

    let group = null;
    let members = null;
    if (savingGroupId) {
      group = await GroupSaving.findById(savingGroupId);
      members = await GroupSavingParticipation.find({ groupSaving: savingGroupId });
    }
    else if (budgetGroupId) {
      group = await SharedBudget.findById(budgetGroupId);
      members = await SharedBudgetParticipation.find({ sharedBudget: budgetGroupId });
    }

    if (!group) {
      return NextResponse.json({ response: 'Group not found' }, { status: 404 });
    }

    let progress : IMemberProgress[] = [];
    members.forEach(userId => {
      progress.push({
        user: userId,
        currentProgress: 0,
        lastUpdate: new Date(Date.now()),
        checkpointPassed: []
      });
    });

    // Create a new challenge
    const newChallenge = await FinancialChallenge.create([{
      createdBy: user._id,
      name: name,
      description: description,
      category: category,
      savingGroupId: savingGroupId,
      budgetGroupId: budgetGroupId,
      createdDate: Date.now(),
      progress: progress
    }], {session: dbSession});

    await dbSession.commitTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    return  NextResponse.json({ response: newChallenge }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    console.log("Error creating group saving: ", error);
    return NextResponse.json({ response: 'Failed to create group saving'}, { status: 500 });
  }
};