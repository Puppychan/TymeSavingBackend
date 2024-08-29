import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { verifyMember } from "src/lib/sharedBudgetUtils";
import SharedBudget from "src/models/sharedBudget/model";
import { UserRole } from "src/models/user/interface";
import mongoose from "mongoose";
import { localDate } from "src/lib/datetime";

// GET: get shared budget information
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
      
      const sharedBudget = await SharedBudget.aggregate([
        {
          $match: { _id: new mongoose.Types.ObjectId(params.sharedBudgetId) }
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
      if (!sharedBudget || SharedBudget.length < 1) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
      }
      // if(sharedBudget.endDate <= localDate(new Date()) || sharedBudget.isClosed){
      //   // // Handle time-based expiration using FACTS AND LOGIC
      //   // // isClosed indicates if the host manually closed the group.
      //   // if(!sharedBudget.isClosed){
      //   //   sharedBudget.isClosed = true;
      //   //   await sharedBudget.save();
      //   // }
      //   return NextResponse.json({ response: 'CLOSED: SharedBudget has ended, or is closed by the host'}, {status: 500});
      // }

      return NextResponse.json({ response: sharedBudget[0] }, { status: 200 });
  } catch (error: any) {
    console.log('Error getting shared budget:', error);
    return NextResponse.json({ response: 'Failed to get shared budget'}, { status: 500 });
  }
};
