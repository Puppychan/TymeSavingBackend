import mongoose, {Document} from 'mongoose';

export enum approveStatuses{
    Approved = "Approved",
    Pending = "Pending"
}

// Interface for GroupSaving document
export interface IGroupSaving extends Document {
    hostedBy: mongoose.Types.ObjectId;
    name: string;
    description: string;
    amount: number; //goal amount
    concurrentAmount: number;
    createdDate: Date;
    endDate: Date;
    approveStatus: string;
}