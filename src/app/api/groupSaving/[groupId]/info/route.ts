import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/groupSavingUtils";
import GroupSaving from "src/models/groupSaving/model";
import { UserRole } from "src/models/user/interface";
import { localDate } from "src/lib/datetime";
import mongoose from "mongoose";

// GET: get group saving information
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

      
      const group = await GroupSaving.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(params.groupId) }
        },
        {
          $lookup: {
            from: 'users', // Name of the users collection
            localField: 'hostedBy', // Field in GroupSaving that references the user's _id
            foreignField: '_id', // Field in User that is the _id
            as: 'hostedBy'
          }
        },
        {
          $unwind: '$hostedBy' // Unwind the hostedBy array to make it an object
        },
        {
          $addFields: {
            hostedByFullName: '$hostedBy.fullname', // only show hostedBy with the fullname and id
            hostedBy: '$hostedBy._id'
          }
        }
      ]);
      if (!group || group.length < 1) {
        return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
      }
      // if(group.endDate <= localDate(new Date()) || group.isClosed){
      //   // // Handle time-based expiration with logic. 
      //   // // isClosed indicates if the host manually closed the group.
      //   // if(!group.isClosed){
      //   //   group.isClosed = true;
      //   //   await group.save();
      //   // }
      //   return NextResponse.json({ response: 'CLOSED: GroupSaving has ended, or is closed by the host'}, {status: 500});
      // }

      return NextResponse.json({ response: group[0] }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting group saving:', error);
    return NextResponse.json({ response: 'Failed to get group saving: ' + error}, { status: 500 });
  }
};
