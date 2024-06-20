import mongoose, {Schema} from 'mongoose';
import { ISharedBudgetParticipation } from './interface';

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
    isHost: {
      type: Boolean,
      required: true,
      default: false
    }
});

const SharedBudgetParticipation = mongoose.models.SharedBudget || mongoose.model<ISharedBudgetParticipation>('SharedBudgetParticipation', sharedBudgetParticipationSchema);

export default SharedBudgetParticipation;
