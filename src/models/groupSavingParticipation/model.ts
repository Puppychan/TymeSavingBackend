import mongoose, {Schema} from 'mongoose';
import { GroupRole, IGroupSavingParticipation } from './interface';

// Define the schema for the user
const groupSavingParticipationSchema: Schema = new Schema({
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    groupSaving: {
      type: Schema.Types.ObjectId,
      ref: 'GroupSaving',
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

const GroupSavingParticipation = mongoose.models.GroupSavingParticipation || mongoose.model<IGroupSavingParticipation>('GroupSavingParticipation', groupSavingParticipationSchema);

export default GroupSavingParticipation;
