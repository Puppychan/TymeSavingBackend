'use client'
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyMember } from "src/lib/sharedBudgetUtils";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { UserRole } from "src/models/user/interface";
import User from "src/models/user/model";

// GET: get the member list of a shared budget (including host and members)
export const GET = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
      const searchParams = req.nextUrl.searchParams
      const userId = searchParams.get('userId')

      await connectMongoDB();

      const user = await User.findOne({ _id: userId });
      if (!user) {
        return NextResponse.json({ response: 'User not found' }, { status: 404 });
      }

      if (user.role !== UserRole.Admin) {
        const isMember = await verifyMember(userId, params.sharedBudgetId)
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
                              {_id: 0, sharedBudget: 0}
                            ).populate('user')

      return NextResponse.json({ response: members }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting member list:', error);
    return NextResponse.json({ response: 'Failed to get member list'}, { status: 500 });
  }
};

