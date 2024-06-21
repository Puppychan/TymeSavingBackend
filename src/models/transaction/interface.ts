import mongoose, {Document} from 'mongoose';

export enum TransactionType{
    Income = 'Income',
    Expense = 'Expense'
}

// Fixed list of categories
export enum TransactionCategory {
    DineOut = "Dine out",
    Shopping = "Shopping",
    Travel = "Travel",
    Entertainment = "Entertainment",
    Personal = "Personal",
    Transportation = "Transportation",
    RentMortgage = "Rent/Mortgage",
    Utilities = "Utilities",
    BillsFees = "Bills & Fees",
    Health = "Health",
    Education = "Education",
    Groceries = "Groceries",
    Gifts = "Gifts",
    Work = "Work",
    OtherExpenses = "Other expenses",
    FreelanceWork = "Freelance Work",
    Salary = "Salary",
    Interest = "Interest",
    InvestmentIncome = "Investment Income",
    BusinessProfits = "Business Profits",
    Incomingtransfer = "Incoming transfer",
    OtherIncomes = "Other incomes"
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