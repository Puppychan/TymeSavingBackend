import {Document, ObjectId} from 'mongoose';

export enum UserRole {
  Admin = 'Admin',
  Customer = 'Customer'
}

export enum TymeRewardLevel {
  Classic = 'Classic',
  Silver = 'Silver',
  Gold = 'Gold',
  Platinum = 'Platinum'
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
    avatar: string;
    userPoints:  number;
    tymeReward: TymeRewardLevel; 
    // user financial information
    // bankAccounts: any[]; //list of bank accounts - specify format later

}
  