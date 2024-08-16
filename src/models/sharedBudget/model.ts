import mongoose, {Schema} from 'mongoose';
import { approveStatuses, ISharedBudget } from './interface';

// Define the schema for the user
const sharedBudgetSchema: Schema = new Schema({
    hostedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {type: String, required: true},
    description: {type: String},
    amount: {type: Number, default: 0}, //initial amount
    concurrentAmount: {type: Number, default: 0},
    createdDate: {type: Date, default: Date.now()},
    endDate: {type: Date},
    defaultApproveStatus: {
      type: String,
      enum: approveStatuses,
      required: true,
      default: "Approved"
    },
    isClosed: {
      type: Boolean, 
      default: false
    } // true when the host deactivates, or when "endDate" is reached
});

const SharedBudget = mongoose.models.SharedBudget || mongoose.model<ISharedBudget>('SharedBudget', sharedBudgetSchema);

export default SharedBudget;
