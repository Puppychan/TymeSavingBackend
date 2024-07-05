import {Document, ObjectId} from 'mongoose';

export enum GroupRole {
  Host = 'Host',
  Member = 'Member'
}

// Interface for GroupSavingParticipation document
export interface IGroupSavingParticipation extends Document {
    groupSaving: ObjectId;
    user: ObjectId;
    joinedDate: Date;
    role: GroupRole;
}