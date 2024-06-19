import mongoose, { Document } from "mongoose";

export enum UserInvitationStatus{
    Accepted = "Accepted",
    Cancelled = "Cancelled",
    Pending = "Pending"
}

export interface IUserInvitation extends Document{
    userId: mongoose.Types.ObjectId,
    invitationId:  mongoose.Types.ObjectId,
    status: UserInvitationStatus
}
