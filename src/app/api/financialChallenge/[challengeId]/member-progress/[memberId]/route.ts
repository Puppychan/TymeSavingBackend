import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/financialChallengeUtils";
import ChallengeProgress from "src/models/challengeProgress/model";
import FinancialChallenge from "src/models/financialChallenge/model";
import User from "src/models/user/model";
import { ObjectId } from "mongodb";
import { startSession } from "mongoose";
import { IChallengeProgress } from "src/models/challengeProgress/interface";
import { localDate } from "src/lib/datetime";

// GET: get one member' progress information
export const GET = async (req: NextRequest, { params }: { params: { challengeId: string, memberId: string }}) => {
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
        { $match: { _id: new ObjectId(params.challengeId) } },
        {
          $lookup: {
            from: 'challengeprogresses',
            let: { challengeId: '$_id' },
            pipeline: [
              { $match: { $expr: 
                { $and: 
                  [{ $eq: ['$challengeId', '$$challengeId'] }, 
                  { $eq: ['$userId', new ObjectId(params.memberId)] }] 
                } 
              } },
              {
                $project: {
                  _id: 1,
                  challengeId: 1,
                  currentProgress: 1,
                  reachedMilestone: { $size: '$checkpointPassed' }
                }
              }
            ],
            as: 'memberProgress'
          }
        },
        {
          $project: {
            _id: 1,
            'memberProgress._id': 1,
            'memberProgress.challengeId': 1,
            'memberProgress.currentProgress': 1,
            'memberProgress.reachedMilestone': 1
          }
        }
      ]).exec();

      if (!challenge) {
        return NextResponse.json({ response: 'Financial Challenge not found' }, { status: 404 });
      }

      return NextResponse.json({ response: challenge[0] }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting financial challenge info:', error);
    return NextResponse.json({ response: 'Failed to get financial challenge info: ' + error}, { status: 500 });
  }
};

// PUT: edit challenge information
export const PUT = async (req: NextRequest, { params }: { params: { challengeId: string, memberId: string }}) => {
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

      const payload = await req.json() as Partial<IChallengeProgress>;

      const challengeProgress = await ChallengeProgress.findOne({
        challengeId: params.challengeId,
        userId: params.memberId
      });
      if (!challengeProgress) {
        return NextResponse.json({ response: 'Progress of this member is not found' }, { status: 404 });
      }

      const updateQuery: any = {};
      Object.keys(payload).forEach(key => {
          updateQuery[`${key}`] = payload[key as keyof IChallengeProgress];
      });
      updateQuery.lastUpdate = localDate(new Date());

      const updated = await ChallengeProgress.findOneAndUpdate(
          { challengeId: params.challengeId, userId: params.memberId },
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