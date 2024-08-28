import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/financialChallengeUtils";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import ChallengeProgress from "src/models/challengeProgress/model";
import { IFinancialChallenge } from "src/models/financialChallenge/interface";
import FinancialChallenge from "src/models/financialChallenge/model";
import GroupSaving from "src/models/groupSaving/model";
import Reward from "src/models/reward/model";
import SharedBudget from "src/models/sharedBudget/model";
import User from "src/models/user/model";
import mongoose from "mongoose";

// GET: get challenge information
export const GET = async (req: NextRequest, { params }: { params: { challengeId: string }}) => {
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

      const challenge = await FinancialChallenge.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(params.challengeId) } },
        {
          $lookup: {
            from: 'users',
            localField: 'members',
            foreignField: '_id',
            as: 'members',
            pipeline: [
              {
                $lookup: {
                  from: 'challengeprogresses', // Collection for ChallengeProgress
                  localField: '_id', // User ID in the users collection
                  foreignField: 'userId', // User ID in the ChallengeProgress collection
                  as: 'progress', // Merged field
                  pipeline: [
                    {
                      $match: {
                        challengeId: new mongoose.Types.ObjectId(params.challengeId)
                      }
                    },
                    {
                      $addFields: {
                        checkpointPassed: { $ifNull: ['$checkpointPassed', []] },
                        numCheckpointPassed: { $size: { $ifNull: ['$checkpointPassed', []] } }
                      }
                    },
                    {
                      $project:{
                        numCheckpointPassed: 1,
                        currentProgress: 1,
                        _id: 0
                      }
                    }
                  ]
                }
              },
              {
                $addFields: {
                  numCheckpointPassed: { $arrayElemAt: ['$progress.numCheckpointPassed', 0] },
                  currentProgress: { $arrayElemAt: ['$progress.currentProgress', 0] }
                }
              },
              {
                $project: {
                  password: 0,
                  progress: 0
                }
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'groupsavings',
            localField: 'savingGroupId',
            foreignField: '_id',
            as: 'savingGroup',
          },
        },
        {
          $lookup: {
            from: 'sharedbudgets',
            localField: 'budgetGroupId',
            foreignField: '_id',
            as: 'budgetGroup',
          },
        },
        {
          $unwind: {
            path: '$savingGroup',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$budgetGroup',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'challengecheckpoints',
            localField: 'checkpoints',
            foreignField: '_id',
            as: 'checkpoints',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creator',
          },
        },
        {
          $unwind: {
            path: '$creator',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            createdBy: '$creator.fullname'
          }
        },
        {
          $project:{
            creator: 0
          }
        }
      ]);      

      if (challenge && challenge.length < 1){
        return NextResponse.json({ response: "Challenge not found." }, { status: 404 });
      }
      let response = challenge[0];
      if (response.savingGroupId) {
        response['groupName'] = response.savingGroup.name;
      } else if (response.budgetGroupId) {
        response['groupName'] = response.budgetGroup.name;
      }


      return NextResponse.json({ response: response }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting financial challenge info:', error);
    return NextResponse.json({ response: 'Failed to get financial challenge info: ' + error}, { status: 500 });
  }
};

// PUT: edit challenge information
export const PUT = async (req: NextRequest, { params }: { params: { challengeId: string }}) => {
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

      const payload = await req.json() as Partial<IFinancialChallenge>

      const challenge = await FinancialChallenge.findById(params.challengeId)
      if (!challenge) {
        return NextResponse.json({ response: 'Financial Challenge not found' }, { status: 404 });
      }

      const updateQuery: any = {};
      Object.keys(payload).forEach(key => {
          updateQuery[`${key}`] = payload[key as keyof IFinancialChallenge];
      });

      // If this challenge does not have ANY checkpoints, it cannot be made published (false -> true)
      const checkpoints = await ChallengeCheckpoint.findOne({challengeId: params.challengeId});
      if(challenge.isPublished == false && updateQuery.isPublished == true && !checkpoints){
        return NextResponse.json({ response: 'Cannot publish: Financial Challenge has no checkpoints' }, { status: 500 });
      }

      // Otherwise, update.
      const updated = await FinancialChallenge.findOneAndUpdate(
          { _id: params.challengeId },
          { $set: updateQuery },
          {
              new: true,
              runValidators: true,
              session: dbSession
          }
      );

      await dbSession.commitTransaction();  // Commit the transaction
      await dbSession.endSession();  // End the session

      return NextResponse.json({ response: updated }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    console.log('Error updating financial challenge info:', error);
    return NextResponse.json({ response: 'Failed to update financial challenge info: ' + error }, { status: 500 });
  }
};


// DELETE: delete challenge (available only for the Host)
export const DELETE = async (req: NextRequest, { params }: { params: { challengeId: string }}) => {
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

      const deletedChallenge = await FinancialChallenge.findOneAndDelete({ _id: params.challengeId}, { session: dbSession });
      if (!deletedChallenge) {
        return NextResponse.json({ response: 'Challenge not found' }, { status: 404 });
      }

      const { checkpoints, memberProgress } = deletedChallenge;

      for (let i = 0; i < checkpoints.length; i++) {
        let deletedCheckpoint = await ChallengeCheckpoint.findByIdAndDelete(checkpoints[i], { session: dbSession });
        console.log('Deleted checkpoint:', deletedCheckpoint);

        if (deletedCheckpoint && deletedCheckpoint.reward) {
          let deletedReward = await Reward.findByIdAndDelete(deletedCheckpoint.reward, { session: dbSession });
          console.log('Deleted reward:', deletedReward);
        }
      }

      await ChallengeProgress.deleteMany({ _id: { $in: memberProgress } }, { session: dbSession });

      await dbSession.commitTransaction();  // Commit the transaction
      await dbSession.endSession();  // End the session

      return NextResponse.json({ response: "Deleted challenge successfully: " + deletedChallenge._id }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    console.log('Error deleting financial challenge:', error);
    return NextResponse.json({ response: 'Failed to delete financial challenge: ' + error }, { status: 500 });
  }
};