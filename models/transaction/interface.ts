import {Document} from 'mongoose';

export enum TransactionType{
    Income = 'Income',
    Expense = 'Expense'
}

// TODO: Fixed list of categories here
export enum Categories {

}

// Interface for transaction document
export interface ITransaction extends Document {
    // MongoDB IDs
    userId: string;

    createdDate: Date;
    editedDate: Date;
    description: string;
    type: TransactionType;
    amount: number;
    transactionImages: string[];
    payBy: string; // MongoDB ID of the paying user

    // TODO: Enum list of categories
    category: string;

    // To be added
    savingId: string; // MongoDB ID of the saving group that this transaction is in
    budgetId: string; // MongoDB ID of the budget group that this transaction is in
}