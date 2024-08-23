import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Invitation from "src/models/invitation/model";
import { InvitationType } from "src/models/invitation/interface";
import UserInvitation from "src/models/userInvitation/model";
import { startSession } from "mongoose";
import GroupSaving from "src/models/groupSaving/model";
import SharedBudget from "src/models/sharedBudget/model";

/*
    POST: CREATE a new invitation
*/

// Create a code. Then scour the database to make sure that the code is UNIQUE!
const newCode = (length: number) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

export const POST = async (req: NextRequest) => {
  await connectMongoDB();
  const session = await startSession();
  session.startTransaction();
  try {
    const payload = await req.json();
    // Invitation.id will be auto assigned by MongoDB
    // Invitation.code will be generated here
    const length = 6; // Adjust length as needed
    let uniqueCodeFound = false;
    let generatedCode = "";
    // Export all the codes in the document
    const existingInvitations = await Invitation.find({}, "code").exec();
    const existingCodes = existingInvitations.map(
      (invitation) => invitation.code
    );
    while (!uniqueCodeFound) {
      generatedCode = newCode(length);
      // Check if the code exists in the Invitation collection: NO -> STOP
      if (!existingCodes.includes(generatedCode)) {
        uniqueCodeFound = true;
      }
    }
    // Read information from request
    var { description, type, groupId, users, cancelledUsers } = payload;

    // Check if the group exists
    let groupType = (type == "SharedBudget") ? InvitationType.SharedBudget : InvitationType.GroupSaving;
    if (groupType === InvitationType.GroupSaving) {
      const savingGroup = await GroupSaving.findById(groupId);
      if(!savingGroup){
          return NextResponse.json({response: "No such Group Saving", status: 404});
      }
    }
    else{
      const budgetGroup = await SharedBudget.findById(groupId);
      if(!budgetGroup){
          return NextResponse.json({response: "No such Shared Budget", status: 404});
      }
    }

    // if (users) {
    //   const trimmedUsers = users.slice(1, -1);
    //   usersArray = trimmedUsers.split(",").map((link: string) => link.trim());
    // }

    // Parse users and cancelledUsers: from u1;u2;u3 to [u1, u2, u3]
    // let usersList = [];
    // let cancelledUsersList = [];
    // if(users){
    //     usersList = users.split(';').map(link => link.trim());
    // }
    // if(cancelledUsers){
    //     cancelledUsersList = cancelledUsers.split(';').map(link => link.trim());
    // }
    const newInvitation = new Invitation({
      code: generatedCode,
      description: description,
      type: groupType,
      groupId: groupId,
      users: users,
      cancelledUsers: cancelledUsers ? cancelledUsers : [],
    });
    await newInvitation.save({ session });
    const newInvitationId = newInvitation._id;

    if (users) {
      const newUserInvitations = users.map((user) => ({
        userId: user,
        invitationId: newInvitationId,
        status: "Pending",
      }));
      await UserInvitation.insertMany(newUserInvitations, { session });
    }

    const insertedUserInvitations =
      users.length > 0
        ? await UserInvitation.find({ invitationId: newInvitationId }).session(session)
        : [];

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({
      response: [newInvitation, insertedUserInvitations],
      status: 200,
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ response: error.message }, { status: 500 });
  }
};
