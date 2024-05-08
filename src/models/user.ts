import mongoose, {Schema, Document} from 'mongoose';

// Interface for user document
interface IUser extends Document {
    // user provided information
    username: string;
    user_phone: string;
    user_email: string;
    user_password: string;

    // user assigned information
    role: string;

    // user financial information
    bankAccounts: any[]; //list of bank accounts - specify format later
    user_points:  any[]; // list of points in different groups - specify format later
  }
  
// Define the schema for the user
const userSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    // user provided information
    user_phone: { type: String, required: true, unique: true },
    user_email: { type: String, required: true},
    user_password: { type: String, required: true},

    // user assigned information
    role: { type: String, required: true, default: 'customer'},
    
    // user financial information
    bankAccounts: { type: [Schema.Types.Mixed], default: []}, // list of bank accounts - specify format later
    user_points:  { type: [Schema.Types.Mixed], default: []}, // list of points in different groups - specify format later
  });

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);