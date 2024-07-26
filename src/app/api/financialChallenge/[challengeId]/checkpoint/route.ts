import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/financialChallengeUtils";
import { IChallengeCheckpoint } from "src/models/challengeCheckpoint/interface";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import FinancialChallenge from "src/models/financialChallenge/model";
import Reward from "src/models/reward/model";

// POST: Add checkpoints to a challenge
export const POST = async (req: NextRequest, { params }: { params: { challengeId: string }}) => {
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

    const payload = await req.json() as Partial<IChallengeCheckpoint>[]

    const challenge = await FinancialChallenge.findOne({ _id: params.challengeId})
    if (!challenge) {
      return NextResponse.json({ response: 'Challenge not found' }, { status: 404 });
    }

    // create checkpoints
    let checkpoints : IChallengeCheckpoint[] = [];
    for (let i = 0; i < payload.length; i++) {
      const { name, description, checkpointValue, reward, startDate, endDate } = payload[i];
      let newReward = null;
      if (reward) {
        newReward = await Reward.create([{...reward, createdBy: authUser._id}], {session: dbSession});
      }

      let newCheckpoint = await ChallengeCheckpoint.create([{
        challengeId: challenge._id,
        name: name,
        description: description,
        checkpointValue: checkpointValue,
        reward: newReward ? newReward[0] : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        createdBy: authUser._id,
      }], {session: dbSession});

      checkpoints.push(newCheckpoint[0]);
    }
    
    // Add the new checkpoints to the challengen 
    challenge.checkpoints.push(...checkpoints.map(checkpoint => checkpoint._id));
    await challenge.save({session: dbSession});
    
    await dbSession.commitTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    return  NextResponse.json({ response: checkpoints }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    console.log("Error creating challenge checkpoint: ", error);
    return NextResponse.json({ response: 'Failed to create challenge checkpoint: ' + error}, { status: 500 });
  }
};