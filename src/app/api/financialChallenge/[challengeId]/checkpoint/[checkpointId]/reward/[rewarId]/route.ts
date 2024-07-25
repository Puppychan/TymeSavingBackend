import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/financialChallengeUtils";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import FinancialChallenge from "src/models/financialChallenge/model";
import { IReward } from "src/models/reward/interface";
import Reward from "src/models/reward/model";

// PUT: Update a reward
export const PUT = async (req: NextRequest, { params }: { params: { challengeId: string , checkpointId: string, rewardId: string}}) => {
  const dbSession = await startSession();
  dbSession.startTransaction();

  try {
    await connectMongoDB();
    
    const verification = await verifyAuth(req.headers)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const authUser = verification.response;

    if (authUser.role !== 'Admin') {
      let isMember = await verifyMember(authUser._id, params.challengeId)
      if (!isMember) {
        return NextResponse.json({ response: 'This user is neither an admin nor a member of the financial challenge' }, { status: 401 });
      }
    }

    const payload = await req.json() as Partial<IReward>

    const challenge = await FinancialChallenge.findOne({ _id: params.challengeId, checkpoints: {$in: [params.checkpointId]}})
    if(!challenge) {
      return NextResponse.json({ response: 'Either challenge not found, or The checkpoint isnt belong to this challenge' }, { status: 404 });
    }

    const updateQuery: any = {};
    Object.keys(payload).forEach(key => {
      updateQuery[`${key}`] = payload[key as keyof IReward];
    });

    const updated = await Reward.findOneAndUpdate(
      { _id: params.rewardId },
      { $set: updateQuery },
      {
        new: true,
        runValidators: true,
        session: dbSession
      }
    );

    if (!updated) {
      return NextResponse.json({ response: 'Reward not found' }, { status: 404 });
    }
      
    await dbSession.commitTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    return  NextResponse.json({ response: updated }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    console.log("Error updating Reward: ", error);
    return NextResponse.json({ response: 'Failed to update Reward: ' + error }, { status: 500 });
  }
};


//DELETE: Delete a checkpoint
export const DELETE = async (req: NextRequest, { params }: { params: { challengeId: string , checkpointId: string, rewardId: string}}) => {
  const dbSession = await startSession();
  dbSession.startTransaction();

  try {
    await connectMongoDB();
    
    const verification = await verifyAuth(req.headers)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const authUser = verification.response;

    if (authUser.role !== 'Admin') {
      let isMember = await verifyMember(authUser._id, params.challengeId)
      if (!isMember) {
        return NextResponse.json({ response: 'This user is neither an admin nor a member of the financial challenge' }, { status: 401 });
      }
    }

    const deleted = await Reward.findOneAndDelete({ _id: params.rewardId }, { session: dbSession });

    // remove reward from checkpoint
    const checkpoint = await ChallengeCheckpoint.findOneAndUpdate(
      { _id: params.challengeId},
      { $set: { reward: null } },
      {
        new: true,
        runValidators: true,
        session: dbSession
      }
    );
      
    await dbSession.commitTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    return  NextResponse.json({ response: 'Reward is deleted successfully' }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    console.log("Error deleting reward: ", error);
    return NextResponse.json({ response: 'Failed to delete reward: ' + error }, { status: 500 });
  }
};