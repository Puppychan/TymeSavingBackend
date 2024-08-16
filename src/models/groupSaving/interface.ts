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
    defaultApproveStatus: string; // when a transaction is created, it will be Approved/Pending by default
    isClosed: boolean; // true when the host deactivates, or when "endDate" is reached
}