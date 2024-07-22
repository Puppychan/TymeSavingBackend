import {Document, ObjectId} from 'mongoose';
import { IReward } from '../reward/interface';

export interface IChallengeCheckpoint extends Document {
    name: string;
    description: string;
    checkpoint: number;
    reward: IReward;
    startDate: Date;
    endDate: Date;
}