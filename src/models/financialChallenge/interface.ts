import {Document, ObjectId} from 'mongoose';
import { IChallengeCheckpoint } from '../challengeCheckpoint/interface';

export enum ChallengeCategory {
    Saving = 'Saving',
    Spending = 'Spending'
}

export interface IMemberProgress {
    user: ObjectId;
    currentProgress: number;
    lastUpdate: Date;
    checkpointPassed: ObjectId[];
}

// Interface for FinancialChallenge document
export interface IFinancialChallenge extends Document {
    name: string;
    description: string;
    category: ChallengeCategory;
    challengeCheckpoint: IChallengeCheckpoint[];
    progress: IMemberProgress[];

    savingGroupId: ObjectId;
    budgetGroupId: ObjectId;

    createdDate: Date;
    startDate: Date;
    endDate: Date;

    createdBy: ObjectId;
}