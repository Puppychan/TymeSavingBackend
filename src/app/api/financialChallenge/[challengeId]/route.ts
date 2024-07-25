import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/financialChallengeUtils";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import { IFinancialChallenge } from "src/models/financialChallenge/interface";
import FinancialChallenge from "src/models/financialChallenge/model";
import GroupSaving from "src/models/groupSaving/model";
import Reward from "src/models/reward/model";
import User from "src/models/user/model";

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

      const challenge = await FinancialChallenge
                            .findById(params.challengeId)
                            .populate([
                              {
                                path: 'members',
                                model: User,
                                select: '_id username fullname phone email avatar tymeReward',
                              },
                              {
                                path: 'savingGroupId',
                                model: GroupSaving,
                              },
                              {
                                path: 'checkpoints',
                                model: ChallengeCheckpoint,
                                populate: {
                                  path: 'reward',
                                  model: Reward
                                }
                              }
                            ])

      if (!challenge) {
        return NextResponse.json({ response: 'Financial Challenge not found' }, { status: 404 });
      }

      return NextResponse.json({ response: challenge }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting financial challenge info:', error);
    return NextResponse.json({ response: 'Failed to get financial challenge info: ' + error}, { status: 500 });
  }
};

// PUT: edit challenge information
export const PUT = async (req: NextRequest, { params }: { params: { challengeId: string }}) => {
  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      const payload = await req.json() as Partial<IFinancialChallenge>

      const challenge = await FinancialChallenge.findById(params.challengeId)
      if (!challenge) {
        return NextResponse.json({ response: 'Financial Challenge not found' }, { status: 404 });
      }

      if (authUser.role !== 'Admin') {
        let isMember = await verifyMember(authUser._id, challenge)
        if (!isMember) {
          return NextResponse.json({ response: 'This user is neither an admin nor a member of the financial challenge' }, { status: 401 });
        }
      }

      const updateQuery: any = {};
      Object.keys(payload).forEach(key => {
          updateQuery[`${key}`] = payload[key as keyof IFinancialChallenge];
      });

      const updated = await FinancialChallenge.findOneAndUpdate(
          { _id: params.challengeId },
          { $set: updateQuery },
          {
              new: true,
              runValidators: true,
          }
      );

      return NextResponse.json({ response: updated }, { status: 200 });
  } catch (error: any) {
    console.log('Error updating financial challenge info:', error);
    return NextResponse.json({ response: 'Failed to update financial challenge info: ' + error }, { status: 500 });
  }
};


// PUT: edit challenge information (available only for the Host)
export const DELETE = async (req: NextRequest, { params }: { params: { challengeId: string }}) => {
  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      const challenge = await FinancialChallenge.findOneAndDelete({ _id: params.challengeId})
      if (!challenge) {
        return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
      }

      if (authUser.role !== 'Admin') {
        let isMember = await verifyMember(authUser._id, challenge)
        if (!isMember) {
          return NextResponse.json({ response: 'This user is neither an admin nor a member of the financial challenge' }, { status: 401 });
        }
      }

      return NextResponse.json({ response: "Delted successfully" }, { status: 200 });
  } catch (error: any) {
    console.log('Error deleting financial challenge:', error);
    return NextResponse.json({ response: 'Failed to delete financial challenge: ' + error }, { status: 500 });
  }
};