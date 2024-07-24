import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { IChallengeCheckpoint } from "src/models/challengeCheckpoint/interface";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import FinancialChallenge from "src/models/financialChallenge/model";
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

    const payload = await req.json() as Partial<IChallengeCheckpoint>[]

    console.log("Payload: ", payload);

    const challenge = await FinancialChallenge.findOne({ _id: params.challengeId})
    if (!challenge) {
      return NextResponse.json({ response: 'Challenge not found' }, { status: 404 });
    }

    // create checkpoints
    let checkpoints : IChallengeCheckpoint[] = [];
    for (let i = 0; i < payload.length; i++) {
      const { name, description, checkpointValue, reward, startDate, endDate } = payload[i];

      let newCheckpoint = await ChallengeCheckpoint.create([{
        challengeId: challenge._id,
        name: name,
        description: description,
        checkpointValue: checkpointValue,
        reward: reward ? new Reward(reward) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: user._id,
      }], {session: dbSession});

      checkpoints.push(newCheckpoint[0]);
    }
    
    // Add the new checkpoints to the challenge
    challenge.checkpoints = checkpoints;
    await challenge.save({session: dbSession});
    
    await dbSession.commitTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    return  NextResponse.json({ response: challenge }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    console.log("Error creating challenge checkpoint: ", error);
    return NextResponse.json({ response: 'Failed to create challenge checkpoint: ' + error}, { status: 500 });
  }
};