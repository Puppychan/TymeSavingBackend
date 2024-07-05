import mongoose, {Document} from 'mongoose';

// Interface for GroupSaving document
export interface IGroupSaving extends Document {
    hostedBy: mongoose.Types.ObjectId;
    name: string;
    description: string;
    amount: number; //goal amount
    concurrentAmount: number;
    createdDate: Date;
    endDate: Date;
}