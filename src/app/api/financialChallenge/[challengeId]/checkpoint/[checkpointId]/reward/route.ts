import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/financialChallengeUtils";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import { IReward } from "src/models/reward/interface";
import Reward from "src/models/reward/model";

// POST: Add reward to a checkpoint
export const POST = async (req: NextRequest, { params }: { params: { challengeId: string, checkpointId: string }}) => {
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();
  
  try {
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

    const checkpoint = await ChallengeCheckpoint.findOne({ _id: params.checkpointId, challengeId: params.challengeId})
    if(!checkpoint) {
      return NextResponse.json({ response: 'Either challenge not found, or The checkpoint isnt belong to this challenge' }, { status: 404 });
    }

    let newReward = await Reward.create([{...payload, createdBy: authUser._id}], {session: dbSession});
    checkpoint.reward = newReward[0];
    await checkpoint.save({session: dbSession});

    await dbSession.commitTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    return  NextResponse.json({ response: newReward[0] }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    console.log("Error creating reward: ", error);
    return NextResponse.json({ response: 'Failed to create reward: ' + error}, { status: 500 });
  }
};