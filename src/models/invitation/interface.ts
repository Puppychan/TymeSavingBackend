import mongoose, { Document } from "mongoose";

export enum InvitationType{
    SharedBudget = "SharedBudget", 
    GroupSaving = "GroupSaving"
}

export interface IInvitation extends Document{
    code: string, // 6 character code for the user to enter and join
    description: string,
    type: InvitationType, // is this invitation for SharedBudget or GroupSaving?
    groupId: mongoose.Types.ObjectId, // object ID for the group that this invitation is in
    users: string[], // users that have yet to accept the invitation
    cancelledUsers: string[] // users that have cancelled the invitation
}
