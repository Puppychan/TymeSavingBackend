import mongoose, {Document, ObjectId} from 'mongoose';

export enum BandageValue {
}

export enum RewardCategory {
    Point = 'Point',
    Bandage = 'Bandage'
}

export interface IRewardPrice {
    category: RewardCategory;
    value: number | BandageValue;
}

// Interface for IReward document
export interface IReward extends Document {
    name: string;
    description: string;
    price: IRewardPrice[];
    createdBy: ObjectId;
}