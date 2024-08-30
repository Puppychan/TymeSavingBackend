import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyUser, newToken, verifyUserById } from "src/lib/authentication";
import User from "src/models/user/model";
import UserInvitation from "src/models/userInvitation/model";
import mongoose from "mongoose";

// GET: Read the user information
// Input: groupType, groupId, userId
// Check if userId is valid; Check if user is in this group/invited to group
// return:
// - true: if user is in group or invited to group
// - existed: user exists but not in/invited to group
// - false: no user
export const GET = async (
  req: NextRequest,
  { params }: { params: { userId: string } }
) => {
  try {
    await connectMongoDB();
    const verification = await verifyUserById(req.headers, params.userId)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const userId = params.userId;
    let urlSearchParams = req.nextUrl.searchParams;
    let vnpParams: { [key: string]: string } = {};
    urlSearchParams.forEach((value, key) => {
        vnpParams[key] = value;
    });
    const groupType = vnpParams['groupType'];
    const groupId   = vnpParams['groupId'];
    let aggregate = UserInvitation.aggregate();
    // 1. Match the userId; Check if they are invited, or currently in group
    aggregate.match({
      status: { $in: ['Pending', 'Accepted'] },
      userId: new mongoose.Types.ObjectId(userId)
    });
    // 2. Lookup invitation and group
    aggregate.lookup({
      from: "invitations",
      localField: "invitationId",
      foreignField: "_id",
      as: "invitation"
    });
    aggregate.unwind("$invitation");
    if (groupType === 'SharedBudget'){
      aggregate.match({
        "invitation.type": "SharedBudget"
      });
    }
    else if (groupType === 'GroupSaving'){
      aggregate.match({
        "invitation.type": "GroupSaving"
      });
    }
    else {
      return NextResponse.json({ response: "CheckUser: Wrong group type" }, { status: 500 });
    }
    // 3. Match group id
    aggregate.match({
      "invitation.groupId": new mongoose.Types.ObjectId(groupId)
    });
    const user = await aggregate.exec();

    if (user && user.length > 0) { 
      console.log(user);
      return NextResponse.json({ response: "true" }, { status: 200 });
    }
    else {
      const findUser = await User.findById(userId);
      if(findUser){
        return NextResponse.json({ response: "existed" }, { status: 200 });
      }
      else{
        return NextResponse.json({ response: "false" }, { status: 200 });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ response: error.message }, { status: 500 });
  }
};
