import {Document, ObjectId} from 'mongoose';

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
    checkpoints: ObjectId[];

    members: ObjectId[];
    memberProgress: ObjectId[];

    scope: ChallengeScope;
    savingGroupId: ObjectId;
    budgetGroupId: ObjectId;

    createdDate: Date;
    startDate: Date;
    endDate: Date;

    createdBy: ObjectId;
}