import Invitation from "src/models/invitation/model";
import UserInvitation from "src/models/userInvitation/model";

// Queries for invitation/admin and invitation/byUser/[userId]
/* 
    Sort: 
        groupId
        group type
        invitation status
    Match: 
        groupId
        group type
        invitation status: accepted, cancelled, pending
*/

export const invitationData = async (fromUser: string | null, params) => {
    // fromUser = userId -> show invitations for one user
    try {    
        if(fromUser){

        }
        else{ //Admin stuff

        }
    } catch (error) {
        
    }
}
