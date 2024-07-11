import {Document, ObjectId} from 'mongoose';

export enum ChallengeCategory {
}

// Interface for FinancialChallenge document
export interface IFinancialChallenge extends Document {
    createdBy: ObjectId;
    name: string;
    description: string;
    category: ChallengeCategory;
    checkPoint: number;
    createdDate: Date;
    startDate: Date;
    endDate: Date;
    reward: ObjectId;
}