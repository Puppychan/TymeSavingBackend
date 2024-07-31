import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/financialChallengeUtils";
import ChallengeProgress from "src/models/challengeProgress/model";
import FinancialChallenge from "src/models/financialChallenge/model";
import User from "src/models/user/model";

// PUT: edit a member' progress information
export const PUT = async (req: NextRequest, { params }: { params: { challengeId: string, memberId: string }}) => {
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
                                path: 'memberProgress',
                                model: ChallengeProgress,
                                populate: {
                                  path: 'userId',
                                  model: User,
                                  select: '_id username fullname phone email avatar tymeReward',
                                }
                              }
                            ])
                            .select('memberProgress');

      if (!challenge) {
        return NextResponse.json({ response: 'Financial Challenge not found' }, { status: 404 });
      }

      return NextResponse.json({ response: challenge }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting financial challenge info:', error);
    return NextResponse.json({ response: 'Failed to get financial challenge info: ' + error}, { status: 500 });
  }
};