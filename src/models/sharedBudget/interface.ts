import mongoose, {Document} from 'mongoose';

export enum approveStatuses{
    Approved = "Approved",
    Pending = "Pending"
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
    isClosed: boolean; // true when the host deactivates, or when "endDate" is reached
}