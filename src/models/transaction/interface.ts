import mongoose, {Document} from 'mongoose';

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
    userId: mongoose.Types.ObjectId;

    createdDate: Date;
    editedDate: Date;
    description: string;
    type: TransactionType;
    amount: number;
    transactionImages: string[]; // ORIGINALLY: STRING SEPARATED BY SEMICOLON ;
    payBy: string; // payment methods: cash, Momo, etc.

    savingGroupId: mongoose.Types.ObjectId; // MongoDB ID of the saving group that this transaction is in
    budgetGroupId: mongoose.Types.ObjectId; // MongoDB ID of the budget group that this transaction is in

    category: string;
}