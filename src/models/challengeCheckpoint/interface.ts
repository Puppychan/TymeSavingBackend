import {Document, ObjectId} from 'mongoose';
import { IReward } from '../reward/interface';

export interface IChallengeCheckpoint extends Document {
    challengeId: ObjectId;
    name: string;
    description: string;
    checkpointValue: number;
    reward: IReward;
    startDate: Date;
    endDate: Date;
    createdBy: ObjectId;
}