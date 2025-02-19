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
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import { isUserInGroup, removeUserInvitation } from "src/lib/invitationUtils";
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
        // Handle: user is already in this group - TO be implemented
        const userInGroup = await isUserInGroup(userId, invitation.groupId, invitation.type);
        if(userInGroup){ // user has already joined the group
            await removeUserInvitation(userId, invitationId);
            return NextResponse.json({ response: `User ${userId} has already joined ${invitation.type} with ID ${invitation.groupId}` }, { status: 200 }); 
        }
        // Handle: userId is not in Invitation.users
        var pendingUsers: string[] = invitation.users;
        if(!pendingUsers.includes(userId)){
            return NextResponse.json({response: `This user ${userId} is not currently invited by ${invitationId}`}, {status: 404});
        }
        // User accepts: Remove the user from the invitation's users array
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

        // ADD USER TO GROUP
        if (invitation.type === InvitationType.SharedBudget) {
            console.log(await joinSharedBudget(userId, invitation.groupId));
        }
        if (invitation.type === InvitationType.GroupSaving) {
            console.log(await joinGroupSaving(userId, invitation.groupId));
        } 

        // Save the updated invitation
        await invitation.save({session: dbSession});
        await dbSession.commitTransaction();  // Commit the transaction
        await dbSession.endSession();  // End the session

        return NextResponse.json({ response: `User ${userId} accepted invitation ${invitationId}` }, { status: 200 });
    } catch (error){
        await dbSession.abortTransaction();  // Abort the transaction
        await dbSession.endSession();  // End the session
        return NextResponse.json({ response: `Error: ${error}` }, { status: 500 });
    }
}