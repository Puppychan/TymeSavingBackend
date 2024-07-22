import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { IChallengeCheckpoint } from "src/models/challengeCheckpoint/interface";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import FinancialChallenge from "src/models/financialChallenge/model";
import { IReward } from "src/models/reward/interface";
import Reward from "src/models/reward/model";

export const POST = async (req: NextRequest, { params }: { params: { challengeId: string }}) => {
  const dbSession = await startSession();
  dbSession.startTransaction();

  try {
    await connectMongoDB();
    
    const verification = await verifyAuth(req.headers)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const user = verification.response;

    const payload = await req.json() as Partial<IChallengeCheckpoint>
    const { name, description, checkpoint, reward, startDate, endDate} = payload

    const challenge = await FinancialChallenge.findOne({ _id: params.challengeId})
    if (!challenge) {
      return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
    }

    let newReward : IReward = null;
    if (reward) {
      newReward = new Reward(reward)
      await newReward.save({session: dbSession});
    }

    // Create a new challenge
    let newCheckpoint = new ChallengeCheckpoint({
      createdBy: user._id,
      name: name,
      description: description,
      checkpoint: checkpoint,
      reward: newReward,
      startDate: startDate,
      endDate: endDate,
    })
    await newCheckpoint.save({session: dbSession});

    // Add the new checkpoint to the challenge
    challenge.checkpoints.push(newCheckpoint._id);
    await challenge.save({session: dbSession});
    
    await dbSession.commitTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    return  NextResponse.json({ response: newCheckpoint }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    console.log("Error creating group saving: ", error);
    return NextResponse.json({ response: 'Failed to create group saving'}, { status: 500 });
  }
};