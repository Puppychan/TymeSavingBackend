import mongoose, {Schema} from 'mongoose';
import { IUser, UserRole } from './interface';

// Define the schema for the user
const userSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true},
    pin: {type: String},
    email: { type: String, required: true, unique: true},
    fullname: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.Customer
    },
    creationDate: { type: Date, default: Date.now()},
    avatar: {type: String},

    // user financial information
    // bankAccounts: { type: [Schema.Types.Mixed], default: []}, // list of bank accounts - specify format later
    // userPoints:  { type: [Schema.Types.Mixed], default: []}, // list of points in different groups - specify format later
});

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
