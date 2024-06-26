import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import User from "src/models/user/model";

// DELETE: remove a member from a shared budget (available only for Host User of the shared budget)
export const DELETE = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      const payload = await req.json()
      const { memberId } = payload

      const sharedBudget = await SharedBudget.findById(params.sharedBudgetId)
      if (!sharedBudget) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
      }

      if (authUser._id.toString() !== sharedBudget.hostedBy.toString()) {
        return NextResponse.json({ response: 'Only the Host can remove a member' }, { status: 401 });
      }

      if (memberId === sharedBudget.hostedBy.toString()) {
        return NextResponse.json({ response: 'Host cannot be removed' }, { status: 400 });
      }

      const member = await User.findOne({ _id: memberId });
      if (!member) {
        return NextResponse.json({ response: 'Member not found' }, { status: 404 });
      }

      const removedMember = await SharedBudgetParticipation.findOneAndDelete({ user: memberId, sharedBudget: params.sharedBudgetId });

      return NextResponse.json({ response: "Removed member successfully" }, { status: 200 });
  } catch (error: any) {
    console.log('Error removing member:', error);
    return NextResponse.json({ response: 'Failed to remove member'}, { status: 500 });
  }
};
