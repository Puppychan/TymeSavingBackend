import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import GroupSaving from "src/models/groupSaving/model";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import User from "src/models/user/model";

// GET: Show basic information about this GroupSaving. Used by users before joining.
export const GET = async (req: NextRequest, { params }: { params: { groupId: string }}) => {
  try {
    await connectMongoDB();      
    const group = await GroupSaving.findById(params.groupId)
    if (!group) {
        return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
    }
    // show name, description, username of hostedBy, createdDate, number of participants
    const memberCount = await GroupSavingParticipation.countDocuments({ groupSaving: params.groupId, role: 'Member' });
    const hostedByUser = await User.findById(group.hostedBy);
    if(!hostedByUser){
        return NextResponse.json({ response: 'Error with Group Saving: Host not found' }, { status: 500 });
    }
    const result = {
        name: group.name,
        description: group.description,
        hostUsername: hostedByUser.username,
        memberCount: memberCount,
        createdDate: group.createdDate
    };
      return NextResponse.json({ response: result }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting member list:', error);
    return NextResponse.json({ response: 'Failed to get member list'}, { status: 500 });
  }
};

