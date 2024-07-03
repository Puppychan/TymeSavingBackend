import mongoose, {Schema} from 'mongoose';
import { IUserInvitation, UserInvitationStatus } from './interface';

// InvitationId: ObjectId
// UserId: ObjectId
// status: Accepted | Declined | Pending

const userInvitationSchema: Schema = new Schema({
    userId: {
        type: mongoose.Types.ObjectId, 
        ref: 'User'
    }, // user ID 
    invitationId: {
        type: mongoose.Types.ObjectId,
        ref: 'Invitation'
    },
    status: {
        type: String,
        enum: Object.values(UserInvitationStatus), // Accept/Declined/Pending
        required: true
    }
});

const UserInvitation = mongoose.models.UserInvitation || mongoose.model<IUserInvitation>('UserInvitation', userInvitationSchema);

export default UserInvitation;