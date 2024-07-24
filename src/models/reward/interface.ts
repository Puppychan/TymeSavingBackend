import mongoose, {Document, ObjectId} from 'mongoose';

export enum BandageValue {
}

export enum RewardCategory {
    Point = 'Point',
    Bandage = 'Bandage'
}

export interface IRewardPrize {
    category: RewardCategory;
    value: number | BandageValue;
}

// Interface for IReward document
export interface IReward extends Document {
    checkpointId: ObjectId;
    name: string;
    description: string;
    prize: IRewardPrize[];
}