import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import GroupSaving from "src/models/groupSaving/model";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import { UserRole } from "src/models/user/interface";
import User from "src/models/user/model";

// DELETE: remove a member from a group saving (available only for Host User of the group saving)
export const DELETE = async (req: NextRequest, { params }: { params: { groupId: string }}) => {
  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      const payload = await req.json()
      const { memberId } = payload

      const group = await GroupSaving.findById(params.groupId)
      if (!group) {
        return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
      }

      if (authUser.role !== UserRole.Admin) {
        if (authUser._id.toString() !== group.hostedBy.toString()) {
          return NextResponse.json({ response: 'Only the Host and Admin can edit this group saving' }, { status: 401 });
        }
      }

      if (memberId === group.hostedBy.toString()) {
        return NextResponse.json({ response: 'Host cannot be removed' }, { status: 400 });
      }

      const member = await User.findOne({ _id: memberId });
      if (!member) {
        return NextResponse.json({ response: 'Member not found' }, { status: 404 });
      }

      const removedMember = await GroupSavingParticipation.findOneAndDelete({ user: memberId, groupSaving: params.groupId });

      if (!removedMember) {
        return NextResponse.json({ response: 'Member not found in the group saving' }, { status: 404 });
      }

      return NextResponse.json({ response: "Removed member successfully" }, { status: 200 });
  } catch (error: any) {
    console.log('Error removing member:', error);
    return NextResponse.json({ response: 'Failed to remove member'}, { status: 500 });
  }
};
