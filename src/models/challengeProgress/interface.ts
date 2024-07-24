import {Document, ObjectId} from 'mongoose';

export interface ICheckpointPass {
    checkpointId: ObjectId;
    date: Date;
}

// Interface for FinancialChallenge document
export interface IChallengeProgress extends Document {    
    userId: ObjectId;
    challengeId: ObjectId;
    currentProgress: number;
    lastUpdate: Date;
    checkpointPassed: ICheckpointPass[];
}