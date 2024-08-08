import mongoose, {Schema} from 'mongoose';
import { IGroupSaving, approveStatuses } from './interface';

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
      enum: approveStatuses,
      required: true,
      default: "Approved"
    }
});

const GroupSaving = mongoose.models.GroupSaving || mongoose.model<IGroupSaving>('GroupSaving', groupSavingSchema);

export default GroupSaving;
