import {Document, ObjectId} from 'mongoose';


// Interface for Shared Budget document
export interface ISharedBudgetParticipation extends Document {
    sharedBudget: ObjectId;
    user: ObjectId;
    joinedDate: Date;
    isHost: boolean
}