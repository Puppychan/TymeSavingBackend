import mongoose, {Schema} from 'mongoose';
import { IUser, UserRole } from './interface';

// Define the schema for the user
const userSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true},

    email: { type: String, required: true, unique: true},
    fullname: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
    },

    // user financial information
    bankAccounts: { type: [Schema.Types.Mixed], default: []}, // list of bank accounts - specify format later
    userPoints:  { type: [Schema.Types.Mixed], default: []}, // list of points in different groups - specify format later
});

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
