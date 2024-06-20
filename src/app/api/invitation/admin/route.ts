import Invitation from "src/models/invitation/model";
import UserInvitation from "src/models/userInvitation/model";

export const dynamic = 'force-dynamic';


/* See all invitations, with the following Sorts/Filters:
    Sorts: ascending/descending
        sortCreationDate
        sortUsersNumber
        sortCancelledUsersNumber
    Filter: 
        filterGroupType
    Match:
        getCode
        getGroupType
        descriptionContains: when users can only remember parts of the invitation description
*/
