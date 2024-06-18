import { NextRequest } from "next/server";
import Invitation from "src/models/invitation/model"

// Param: userId, invitationId  
// Pre-requisite: The user must have been invited i.e. must be in the invitation's 'users' array

export const POST = async (req: NextRequest) => {
    const payload = await req.json();
    const { userId, invitationId } = payload;
    // Handle: userId is not in Invitation.users
    // Handle: userId is in Invitation.cancelledUsers -> remove userId from Invitation.users
    // User accepts: Deletes from Invitation.users and add to user array of Invitation.groupId
}