import { ObjectId, startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { getMemberListSavingGroup } from "src/lib/groupSavingUtils";
import { getMemberListBudgetGroup } from "src/lib/sharedBudgetUtils";
import ChallengeProgress from "src/models/challengeProgress/model";
import { ChallengeScope } from "src/models/financialChallenge/interface";
import FinancialChallenge from "src/models/financialChallenge/model";
import { localDate } from "src/lib/datetime";

export const POST = async (req: NextRequest) => {
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();

  try {
    
    const verification = await verifyAuth(req.headers)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const authUser = verification.response;

    const payload = await req.json()
    const { name, description, category, scope, 
      savingGroupId, budgetGroupId, startDate, endDate} = payload

    let members: ObjectId[] = []; // Initialize members as an empty array
    if (scope === ChallengeScope.SavingGroup) {
      members = await getMemberListSavingGroup(savingGroupId);
    }
    else if (scope === ChallengeScope.BudgetGroup) {
      members = await getMemberListBudgetGroup(budgetGroupId);
    }
    else if (scope === ChallengeScope.Personal) {
      members = [authUser._id];
    }

    // Create a new challenge
    let newChallenge = await FinancialChallenge.create([{
      createdBy: authUser._id,
      name: name,
      description: description,
      category: category,
      scope: scope,
      members: members,
      savingGroupId: savingGroupId,
      budgetGroupId: budgetGroupId,
      startDate: startDate ?? localDate(new Date()), // default is now
      // default is 1 month from the startDate
      endDate: endDate ?? new Date().setMonth(startDate.getMonth() + 1) 
    }], {session: dbSession});

    let memberProgress = []
    members.forEach(userId => {
      let progress = {
        userId: userId, 
        challengeId: newChallenge[0]._id
      }
      memberProgress.push(progress);
    });
    memberProgress = await ChallengeProgress.create(memberProgress, {session: dbSession});

    newChallenge = await FinancialChallenge.findOneAndUpdate(
      { _id: newChallenge[0]._id }, 
      { $set: { memberProgress: memberProgress } }, 
      { new: true, runValidators: true, session: dbSession }
    );

    await dbSession.commitTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    return  NextResponse.json({ response: newChallenge }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    console.log("Error creating challenge: ", error);
    return NextResponse.json({ response: 'Failed to create challenge: '+ error}, { status: 500 });
  }
};