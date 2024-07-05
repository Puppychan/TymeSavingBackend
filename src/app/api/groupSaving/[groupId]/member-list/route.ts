import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/groupSavingUtils";
import GroupSaving from "src/models/groupSaving/model";
import GroupSavingParticipation from "src/models/sharedBudgetParticipation/model";
import { UserRole } from "src/models/user/interface";

// GET: get the member list of a group saving (including host and members)
export const GET = async (req: NextRequest, { params }: { params: { groupId: string }}) => {
  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      if (authUser.role !== UserRole.Admin) {
        const isMember = await verifyMember(authUser._id, params.groupId)
        if (!isMember)
          return NextResponse.json({ response: 'This user is neither an admin nor a member of the group saving' }, { status: 401 });
      }
      
      const group = await GroupSaving.findById(params.groupId)
      if (!group) {
        return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
      }

      const members = await GroupSavingParticipation
                            .find(
                              { groupSaving: params.groupId }, 
                              {_id: 0, group: 0})
                            .populate('user', '_id username fullname phone email')

      return NextResponse.json({ response: members }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting member list:', error);
    return NextResponse.json({ response: 'Failed to get member list'}, { status: 500 });
  }
};

