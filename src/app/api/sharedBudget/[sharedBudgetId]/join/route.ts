import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import User from "src/models/user/model";
import { verifyMember } from "../route";

// POST: add a member to a shared budget (after user accept invitation)
export const POST = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
      await connectMongoDB();
      const payload = await req.json()
      const { memberId } = payload

      const exist = await verifyMember(memberId, params.sharedBudgetId)
      if (exist) {
        return NextResponse.json({ response: 'This user is already a member of the shared budget' }, { status: 404 });
      }

      const sharedBudget = await SharedBudget.findById(params.sharedBudgetId)
      if (!sharedBudget) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
      }

      const user = await User.findOne({ _id: memberId });
      if (!user) {
        return NextResponse.json({ response: 'User not found' }, { status: 404 });
      }

      const newParticipation = new SharedBudgetParticipation({
        user: memberId,
        sharedBudget: params.sharedBudgetId,
        isHost: false
      })
  
      await newParticipation.save()

      return NextResponse.json({ response: 'Added member successfully' }, { status: 200 });
  } catch (error: any) {
    console.log('Error updating user:', error);
    return NextResponse.json({ response: 'Failed to add member'}, { status: 500 });
  }
};
