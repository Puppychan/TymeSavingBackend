import mongoose, {Document, ObjectId} from 'mongoose';

export enum RewardCategory {
    Point = 'Point',
    Bandage = 'Bandage'
}

// Interface for IReward document
export interface IReward extends Document {
    name: string;
    category: RewardCategory;
    value: any;
    financialChallenge: ObjectId;
    createdBy: ObjectId;
}