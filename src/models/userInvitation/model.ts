import mongoose, {Schema} from 'mongoose';
import { IUserInvitation, UserInvitationStatus } from './interface';

// InvitationId: ObjectId
// UserId: ObjectId
// status: Accepted | Declined | Pending

const userInvitationSchema: Schema = new Schema({
    userId: mongoose.Types.ObjectId, // user ID 
    invitationId:  mongoose.Types.ObjectId,
    status: UserInvitationStatus
});

const UserInvitation = mongoose.models.Invitation || mongoose.model<IUserInvitation>('UserInvitation', userInvitationSchema);

export default UserInvitation;