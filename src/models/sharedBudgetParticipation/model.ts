import mongoose, {Schema} from 'mongoose';
import { GroupRole, ISharedBudgetParticipation } from './interface';

// Define the schema for the user
const sharedBudgetParticipationSchema: Schema = new Schema({
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sharedBudget: {
      type: Schema.Types.ObjectId,
      ref: 'SharedBudget',
      required: true
    },
    joinedDate: {
      type: Date,
      default: Date.now()
    },
    role: {
      type: String,
      enum: Object.values(GroupRole),
      default: GroupRole.Member
    }
});

const SharedBudgetParticipation = mongoose.models.SharedBudgetParticipation || mongoose.model<ISharedBudgetParticipation>('SharedBudgetParticipation', sharedBudgetParticipationSchema);

export default SharedBudgetParticipation;
