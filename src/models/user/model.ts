import mongoose, {Schema} from 'mongoose';
import { IUser, TymeRewardLevel, UserRole } from './interface';

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
    userPoints: { type: Number, default: 0},
    tymeReward: { 
      type: String, 
      enum: Object.values(TymeRewardLevel), 
      default: TymeRewardLevel.Classic 
    },

    // user financial information
    // bankAccounts: { type: [Schema.Types.Mixed], default: []}, // list of bank accounts - specify format later
});

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
