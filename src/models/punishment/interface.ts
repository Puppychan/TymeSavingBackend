import mongoose, {Document, ObjectId} from 'mongoose';

export enum BandageValue {
}

export enum PunishmentCategory {
    Point = 'Point',
    Bandage = 'Bandage'
}

export interface IPunishmentPrice {
    category: PunishmentCategory;
    value: number | BandageValue;
}

// Interface for IPunishment document
export interface IPunishment extends Document {
    name: string;
    description: string;
    price: IPunishmentPrice[];
    createdBy: ObjectId;
}