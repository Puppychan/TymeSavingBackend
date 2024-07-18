import {Document, ObjectId} from 'mongoose';

export enum ICheckpointCategory {
    Reward = 'Reward',
    Punishment = 'Punishment'
}

export interface IChallengeCheckpoint extends Document {
    name: string;
    description: string;
    type: ICheckpointCategory;
    checkpoint: number;
    reward: ObjectId;
    punishment: ObjectId;
    startDate: Date;
    endDate: Date;
}