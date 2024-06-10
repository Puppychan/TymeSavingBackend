import mongoose, {Schema} from 'mongoose';
import { ITransaction, TransactionType } from './interface';

// Define the schema for the user
const transactionSchema: Schema = new Schema({
    // MongoDB IDs
    id: {type: String, required: true, unique: true},
    userId: {type: String, required: true},

    createdDate: {type: Date, required: true},
    editedDate: {type: Date, required: true},
    description: {type: String},
    type: {
        type: String,
        enum: Object.values(TransactionType),
        default: TransactionType.Expense
      },
    amount: {type: Number, default: 0},
    transactionImages: {type: [String], default: []},
    payBy: {type: String}, // MongoDB ID of the paying user

    // TODO: Enum list of categories. Let users manually input categories for now. Dropdown list later
    category: {type: String},

    // To be added
    savingId: {type: String}, // MongoDB ID of the saving group that this transaction is in
    budgetId: {type: String} // MongoDB ID of the budget group that this transaction is in
});

const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
