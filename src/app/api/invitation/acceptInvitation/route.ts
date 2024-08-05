import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Invitation from "src/models/invitation/model"
import UserInvitation from "src/models/userInvitation/model";
import {UserInvitationStatus} from "src/models/userInvitation/interface";
import User from "src/models/user/model";
import { InvitationType } from "src/models/invitation/interface";
import { joinSharedBudget } from "src/lib/sharedBudgetUtils";
import { joinGroupSaving } from "src/lib/groupSavingUtils";
import { startSession } from "mongoose";
/*
Param: userId, invitationId  
Pre-requisite: The user must have been invited i.e. must be in the invitation's 'users' array
Outcome: 
- Set UserInvitation.status = Accepted
- Remove userId from Invitation.users
- TODO: SharedBudget/GroupSaving add this user to its 'users' array
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
        // User accepts: Deletes from Invitation.users and add to user array of Invitation.groupId
        // Remove the user from the invitation's users array
        invitation.users = pendingUsers.filter((id) => id !== userId);

        // Set UserInvitation.status = Accepted
        const userInvitation = await UserInvitation.findOne({ userId: userId, invitationId: invitationId });
        if (userInvitation) {
            userInvitation.status = UserInvitationStatus.Accepted;
            await userInvitation.save();
        } else {
            // Create a new UserInvitation if it doesn't exist
            await UserInvitation.create({
                userId: userId,
                invitationId: invitationId,
                status: UserInvitationStatus.Accepted,
            });
        }
        // Save the updated invitation
        await invitation.save();

        // ADD USER TO SHARED BUDGET GROUP
        if (invitation.type === InvitationType.SharedBudget) {
            await joinSharedBudget(userId, invitation.groupId)
        }
        if (invitation.type === InvitationType.GroupSaving) {
            await joinGroupSaving(userId, invitation.groupId)
        } 

        await dbSession.commitTransaction();  // Commit the transaction
        await dbSession.endSession();  // End the session

        return NextResponse.json({ response: `User ${userId} accepted invitation ${invitationId}` }, { status: 200 });
    } catch (error){
        await dbSession.abortTransaction();  // Abort the transaction
        await dbSession.endSession();  // End the session
        return NextResponse.json({ response: `Error: ${error}` }, { status: 500 });
    }
}