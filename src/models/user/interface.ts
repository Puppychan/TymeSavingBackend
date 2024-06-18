import mongoose, {Document} from 'mongoose';

export enum UserRole {
  Admin = 'Admin',
  Customer = 'Customer'
}
// Interface for user document
export interface IUser extends Document {
    username: string;
    password: string;
    pin: string;
    email: string;
    fullname: string;
    phone: string;
    role: UserRole;
    creationDate: Date;
    // user financial information
    bankAccounts: any[]; //list of bank accounts - specify format later
    userPoints:  any[]; // list of points in different groups - specify format later

    // joined
    joinedShareBudget: mongoose.Types.ObjectId[]
    joinedGroupSaving: mongoose.Types.ObjectId[]
    joinedChallenge: mongoose.Types.ObjectId[]

}
  