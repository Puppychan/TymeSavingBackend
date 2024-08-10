import mongoose, {Document} from 'mongoose';

export enum approveStatuses{
    Approved = "Approved",
    Declined = "Declined"
}

// Interface for Shared Budget document
export interface ISharedBudget extends Document {
    hostedBy: mongoose.Types.ObjectId;
    name: string;
    description: string;
    amount: number; // initial amount
    concurrentAmount: number;
    createdDate: Date;
    endDate: Date;
    defaultApproveStatus: string;
}