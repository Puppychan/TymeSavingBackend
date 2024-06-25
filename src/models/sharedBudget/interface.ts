import mongoose, {Document} from 'mongoose';

// Interface for Shared Budget document
export interface ISharedBudget extends Document {
    hostedBy: mongoose.Types.ObjectId;
    name: string;
    description: string;
    amount: number;
    concurrentAmount: number;
    createdDate: Date;
    endDate: Date;
}