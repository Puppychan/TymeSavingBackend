import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Invitation from "src/models/invitation/model"
import UserInvitation from "src/models/userInvitation/model";
import {UserInvitationStatus} from "src/models/userInvitation/interface";
import User from "src/models/user/model";
import { startSession } from "mongoose";
/*
Param: userId, invitationId  
Pre-requisite: The user must have been invited i.e. 
- must be in the invitation's 'users' array
- must have an UserInvitation object
Outcome: 
- REmove UserInvitation
- Remove userId from Invitation.users
*/
export const POST = async (req: NextRequest) => {
    const payload = await req.json();
    const { userId, invitationId } = payload;
    await connectMongoDB();
    const dbSession = await startSession();
    dbSession.startTransaction();
    try{
        var invitation = await Invitation.findById(invitationId);
        if(!invitation){
            return NextResponse.json({response: "No such invitation with id: " + invitationId}, {status: 404});
        }
        var user = await User.findById(userId);
        if(!user){
            return NextResponse.json({response: "No such user with id: " + userId}, {status: 404});
        }
        // Handle: userId is not in Invitation.users
        var pendingUsers: string[] = invitation.users;
        if(!pendingUsers.includes(userId)){
            return NextResponse.json({response: `This user ${userId} is not currently invited by ${invitationId}`}, {status: 404});
        }
        // Deletes from Invitation.users and add to user array of Invitation.groupId
        // Remove the user from the invitation's users array
        invitation.users = pendingUsers.filter((id) => id !== userId);
        
        // Delete UserInvitation object
        const userInvitation = await UserInvitation.findOne({ userId: userId, invitationId: invitationId });
        if (userInvitation) {
          // Cannot recall an invitation that has been Accepted or Cancelled
          if (userInvitation.status != 'Pending'){
            throw "Cannot recall Accepted or Cancelled invitation";
          }
          await UserInvitation.deleteOne({ _id: userInvitation._id });
        } else {
          return NextResponse.json({response: `UserInvitation not found for user ${userId} and invitation ${invitationId}`}, {status: 404});
        }
        // Save the updated invitation
        await invitation.save();

        await dbSession.commitTransaction();  // Commit the transaction
        await dbSession.endSession();  // End the session
        return NextResponse.json({ response: `Invitation ${invitationId} recalled for user ${userId}` }, { status: 200 });
    } catch (error){
        await dbSession.abortTransaction();  // Abort the transaction
        await dbSession.endSession();  // End the session
        return NextResponse.json({ response: `Error: ${error}` }, { status: 500 });
    }
    
}