import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Invitation from "src/models/invitation/model";
import { InvitationType } from "src/models/invitation/interface";
import UserInvitation from "src/models/userInvitation/model";
import { startSession } from "mongoose";

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
    let newType = InvitationType.GroupSaving;
    if (type == "SharedBudget") {
      newType = InvitationType.SharedBudget;
    }

    let usersArray = [];
    if (users) {
      const trimmedUsers = users.slice(1, -1);
      usersArray = trimmedUsers.split(",").map((link: string) => link.trim());
    }

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
      type: newType,
      groupId: groupId,
      users: usersArray ? usersArray : [],
      cancelledUsers: cancelledUsers ? cancelledUsers : [],
    });
    await newInvitation.save({ session });
    console.log("Saved new invitation:", newInvitation);
    const newInvitationId = newInvitation._id;

    if (users) {
      const newUserInvitations = usersArray.map((user) => ({
        userId: user,
        invitationId: newInvitationId,
        status: "Pending",
      }));
      await UserInvitation.insertMany(newUserInvitations, { session });
      console.log("Saved new user invitations:", newUserInvitations);
    }

    const insertedUserInvitations =
      usersArray.length > 0
        ? await UserInvitation.find({ invitationId: newInvitationId }).session(session)
        : [];
    console.log("Inserted user invitations checked:", insertedUserInvitations);

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
