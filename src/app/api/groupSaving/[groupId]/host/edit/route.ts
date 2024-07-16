import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { IGroupSaving } from "src/models/groupSaving/interface";
import GroupSaving from "src/models/groupSaving/model";
import { UserRole } from "src/models/user/interface";

// PUT: edit group saving information (available only for the Host of the group saving)
export const PUT = async (req: NextRequest, { params }: { params: { groupId: string }}) => {
  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      const payload = await req.json() as Partial<IGroupSaving>

      const group = await GroupSaving.findById(params.groupId)
      if (!group) {
        return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
      }
      
      if (authUser.role !== UserRole.Admin) {
        if (authUser._id.toString() !== group.hostedBy.toString()) {
          return NextResponse.json({ response: 'Only the Host and Admin can edit this group saving' }, { status: 401 });
        }
      }

      const updateQuery: any = {};
      Object.keys(payload).forEach(key => {
          if (key === 'endDate') {
            updateQuery[`${key}`] = new Date(payload[key as keyof IGroupSaving]);
          }
          else updateQuery[`${key}`] = payload[key as keyof IGroupSaving];
      });

      const updatedgroupSaving = await GroupSaving.findOneAndUpdate(
          { _id: params.groupId },
          { $set: updateQuery },
          {
              new: true,
              runValidators: true,
          }
      );

      return NextResponse.json({ response: updatedgroupSaving }, { status: 200 });
  } catch (error: any) {
    console.log('Error updating group saving:', error);
    return NextResponse.json({ response: 'Failed to update group saving'}, { status: 500 });
  }
};