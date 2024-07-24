import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import FinancialChallenge from "src/models/financialChallenge/model";
import { IReward } from "src/models/reward/interface";
import Reward from "src/models/reward/model";

export const PUT = async (req: NextRequest, { params }: { params: { challengeId: string , checkpointId: string, rewardId: string}}) => {
  const dbSession = await startSession();
  dbSession.startTransaction();

  try {
    await connectMongoDB();
    
    const verification = await verifyAuth(req.headers)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const user = verification.response;

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
      { _id: params.rewardId, checkpointId: params.checkpointId },
      { $set: updateQuery },
      {
        new: true,
        runValidators: true,
        session: dbSession
      }
    );

    if (!updated) {
      return NextResponse.json({ response: 'Either reward not found, or The reward isnt belong to this checkpoint' }, { status: 404 });
    }
      
    await dbSession.commitTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    return  NextResponse.json({ response: updated }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    console.log("Error creating Reward: ", error);
    return NextResponse.json({ response: 'Failed to create Reward'}, { status: 500 });
  }
};