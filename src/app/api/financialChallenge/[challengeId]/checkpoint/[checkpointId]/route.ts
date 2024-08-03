import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/financialChallengeUtils";
import { IChallengeCheckpoint } from "src/models/challengeCheckpoint/interface";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import ChallengeProgress from "src/models/challengeProgress/model";
import FinancialChallenge from "src/models/financialChallenge/model";
import Reward from "src/models/reward/model";
import mongoose from "mongoose";

//GET: get a checkpoint info
export const GET = async (req: NextRequest, { params }: { params: { challengeId: string , checkpointId: string}}) => {
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

    const checkpoint = await ChallengeCheckpoint.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(params.checkpointId),
          challengeId: new mongoose.Types.ObjectId(params.challengeId)
        }
      },
      {
        $lookup: {
          from: 'rewards', // Name of the Reward collection
          localField: 'reward', // Field in ChallengeCheckpoint
          foreignField: '_id', // Field in Reward
          as: 'rewardDetails'
        }
      },
      {
        $unwind: {
          path: '$rewardDetails', 
          preserveNullAndEmptyArrays: true // If there's no matching reward, still return the checkpoint
        }
      },
      {
        $project: {
          _id: 1, // Fields from ChallengeCheckpoint
          challengeId: 1,
          reward: 1,
          rewardDetails: 1 // Includes the matched reward details
        }
      }
    ]);

    if (!checkpoint) {
      return NextResponse.json({ response: 'Either challenge not found, or The checkpoint isnt belong to this challenge' }, { status: 404 });
    }

    return  NextResponse.json({ response: checkpoint[0] }, { status: 200 });
  } catch (error: any) {
    console.log("Error getting checkpoint: ", error);
    return NextResponse.json({ response: 'Failed to get checkpoint: ' + error}, { status: 500 });
  }
};

//PUT: Update a checkpoint
export const PUT = async (req: NextRequest, { params }: { params: { challengeId: string , checkpointId: string}}) => {
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

    const payload = await req.json() as Partial<IChallengeCheckpoint>

    const updateQuery: any = {};
    Object.keys(payload).forEach(key => {
      updateQuery[`${key}`] = payload[key as keyof IChallengeCheckpoint];
    });

    const updated = await ChallengeCheckpoint.findOneAndUpdate(
      { _id: params.checkpointId, challengeId: params.challengeId },
      { $set: updateQuery },
      {
        new: true,
        runValidators: true,
        session: dbSession
      }
    );

    if (!updated) {
      return NextResponse.json({ response: 'Either challenge not found, or The checkpoint isnt belong to this challenge' }, { status: 404 });
    }
      
    await dbSession.commitTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    return  NextResponse.json({ response: updated }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    console.log("Error updating checkpoint: ", error);
    return NextResponse.json({ response: 'Failed to update checkpoint: ' + error}, { status: 500 });
  }
};

//DELETE: Delete a checkpoint
export const DELETE = async (req: NextRequest, { params }: { params: { challengeId: string , checkpointId: string}}) => {
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

    const deletedCheckpoint = await ChallengeCheckpoint.findOneAndDelete(
      { _id: params.checkpointId, challengeId: params.challengeId },
      { session: dbSession }
    );

    if (!deletedCheckpoint) {
      return NextResponse.json({ response: 'Either checkpoint not found, or The checkpoint isnt belong to this challenge' }, { status: 404 });
    }

    const deletedReward = await Reward.findOneAndDelete({ _id: deletedCheckpoint.reward }, { session: dbSession });

    // remove checkpoint from challenge
    const challenge = await FinancialChallenge.findOneAndUpdate(
      { _id: params.challengeId},
      { $pull: { checkpoints: params.checkpointId } },
      { session: dbSession }
    );

    // remove checkpoint from member progress
    const memberProgress = await ChallengeProgress.updateMany(
      { challengeId: params.challengeId, "checkpointPassed.checkpointId": params.checkpointId } ,
      { $pull: { checkpointPassed: { checkpointId: params.checkpointId } } },
      { session: dbSession }
    );
      
    await dbSession.commitTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    return  NextResponse.json({ response: "Deleted checkpoint: " + deletedCheckpoint._id }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    console.log("Error deleting checkpoint: ", error);
    return NextResponse.json({ response: 'Failed to delete checkpoint: ' + error }, { status: 500 });
  }
};