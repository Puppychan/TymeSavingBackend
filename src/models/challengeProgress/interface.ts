import {Document, ObjectId} from 'mongoose';

export interface ICheckpointPass {
    checkpointId: ObjectId;
    date: Date;
}

// Interface for FinancialChallenge document
export interface IChallengeProgress extends Document {    
    user: ObjectId;
    challenge: ObjectId;
    currentProgress: number;
    lastUpdate: Date;
    checkpointPassed: ICheckpointPass[];
}