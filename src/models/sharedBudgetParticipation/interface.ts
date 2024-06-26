import {Document, ObjectId} from 'mongoose';

export enum GroupRole {
    Host = 'Host',
    Member = 'Member'
  }
// Interface for Shared Budget document
export interface ISharedBudgetParticipation extends Document {
    sharedBudget: ObjectId;
    user: ObjectId;
    joinedDate: Date;
    role: GroupRole;
}