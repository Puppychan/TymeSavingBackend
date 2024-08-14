import {Document, ObjectId} from 'mongoose';
import { IChallengeProgress } from '../challengeProgress/interface';
import { IChallengeCheckpoint } from '../challengeCheckpoint/interface';

export enum ChallengeCategory {
    Saving = 'Saving',
    Spending = 'Spending'
}

export enum ChallengeScope {
    Personal = 'Personal',
    SavingGroup = 'SavingGroup',
    BudgetGroup = 'BudgetGroup'
}

// Interface for FinancialChallenge document
export interface IFinancialChallenge extends Document {
    name: string;
    description: string;
    category: ChallengeCategory;
    checkpoints: IChallengeCheckpoint[];

    members: ObjectId[];
    memberProgress: IChallengeProgress[];

    scope: ChallengeScope;
    savingGroupId: ObjectId;
    budgetGroupId: ObjectId;

    createdDate: Date;
    startDate: Date;
    endDate: Date;

    createdBy: ObjectId;
    isPublished: boolean
}