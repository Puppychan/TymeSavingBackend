import mongoose, {Schema} from 'mongoose';
import { IGroupSaving, ApproveStatuses } from './interface';

// Define the schema for the user
const groupSavingSchema: Schema = new Schema({
    hostedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {type: String, required: true},
    description: {type: String},
    amount: {type: Number, default: 0}, //goql amount
    concurrentAmount: {type: Number, default: 0},
    createdDate: {type: Date, default: Date.now()},
    endDate: {type: Date},
    defaultApproveStatus: {
      type: String,
      enum: ApproveStatuses,
      required: true,
      default: "Approved"
    },
    isClosed: {
      type: Boolean, 
      default: false
    } // true when the host deactivates, or when "endDate" is reached
});

const GroupSaving = mongoose.models.GroupSaving || mongoose.model<IGroupSaving>('GroupSaving', groupSavingSchema);

export default GroupSaving;
