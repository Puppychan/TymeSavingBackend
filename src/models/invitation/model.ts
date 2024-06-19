import mongoose, {Schema} from 'mongoose';
import { IInvitation, InvitationType } from './interface';

const invitationSchema: Schema = new Schema({
  code: {type: String, required: true}, // 6 character code for the user to enter and join
  description: {type: String, required: true},
  type: {
      type: String,
      enum: Object.values(InvitationType)
    }, // is this invitation for SharedBudget or GroupSaving?
  groupId: mongoose.Types.ObjectId, // object ID for the group that this invitation is in
  users: {type: [String], default: []}, // users that have yet to accept the invitation
  cancelledUsers: {type: [String], default: []} // users that have cancelled the invitation
});

const Invitation = mongoose.models.Invitation || mongoose.model<IInvitation>('Invitation', invitationSchema);

export default Invitation;