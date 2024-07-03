import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/sharedBudgetUtils";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { UserRole } from "src/models/user/interface";

// GET: get the contribution of the members in a shared budget
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

      let contribution = []
      contribution = await SharedBudgetParticipation.aggregate([
          { $match: { sharedBudget: new ObjectId(params.sharedBudgetId) } },
          { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
          { $unwind : "$user" },
          { $lookup: {
              from: 'transactions', 
              localField: 'user._id', 
              foreignField: 'userId', 
              pipeline:[{ $match: { "budgetGroupId": new ObjectId(params.sharedBudgetId) }} ],
              as: 'transaction'
            } 
          },
          { $sort: { "transaction.createdDate": -1 } },
          { $project: {
              _id: 0,
              sharedBudget: 0,
              user: {
                password: 0,
                pin: 0
              }
            }          
          }
        ])

      return NextResponse.json({ response: contribution }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting member list:', error);
    return NextResponse.json({ response: 'Failed to get member list'}, { status: 500 });
  }
};

