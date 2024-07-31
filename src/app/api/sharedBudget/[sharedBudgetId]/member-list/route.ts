import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/sharedBudgetUtils";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { UserRole } from "src/models/user/interface";

// GET: get the member list of a shared budget (including host and members)
export const GET = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      if (authUser.role !== UserRole.Admin) {
        const isMember = await verifyMember(authUser._id, params.sharedBudgetId)
        if (!isMember)
          return NextResponse.json({ response: 'This user is neither an admin nor a member of the shared budget' }, { status: 401 });
      }
      
      const sharedBudget = await SharedBudget.findById(params.sharedBudgetId)
      if (!sharedBudget) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
      }

      const members = await SharedBudgetParticipation
                            .find(
                              { sharedBudget: params.sharedBudgetId }, 
                              {_id: 0, sharedBudget: 0},
                            )
                            .populate('user', '_id username fullname phone email avatar tymeReward');

      // const members = await SharedBudgetParticipation
      //                       .aggregate([
      //                         { $match: { sharedBudget: new mongoose.Types.ObjectId(params.sharedBudgetId) } },
      //                         { $lookup: {
      //                             from: 'users',
      //                             localField: 'user',
      //                             foreignField: '_id',
      //                             as: 'user'
      //                           }
      //                         },
      //                         { $unwind: '$user' }, // Unwind the user array
      //                         // { $project: { 
      //                         //     'user': 1,

      //                         //   }
      //                         // },
      //                         { $sort: { 'user.fullname': -1 } } // Sort by fullname in ascending order
      //                       ]);

      return NextResponse.json({ response: members }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting member list:', error);
    return NextResponse.json({ response: 'Failed to get member list'}, { status: 500 });
  }
};

