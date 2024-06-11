import mongoose, {Schema} from 'mongoose';
import { ITransaction, TransactionType } from './interface';

// Define the schema for the user
const transactionSchema: Schema = new Schema({
    // MongoDB ID
    userId: {type: mongoose.Types.ObjectId, required: true},

    // Transaction.id will be auto assigned by MongoDB
    // createdDate and editedDate will be assigned when the transaction is created
    createdDate: {type: Date, required: true, default: Date.now},
    editedDate: {type: Date, required: true, default: Date.now},
    description: {type: String},
    type: {
        type: String,
        enum: Object.values(TransactionType),
        default: TransactionType.Expense
      },
    amount: {type: Number, default: 0},
    transactionImages: {type: [String], default: []},
    payBy: {type: mongoose.Types.ObjectId}, // MongoDB ID of the paying user

    // TODO: Enum list of categories. Let users manually input categories for now. Dropdown list later
    category: {type: String},

    // To be added
    // savingId: {type: mongoose.Types.ObjectId, default: ''}, // MongoDB ID of the saving group that this transaction is in
    // budgetId: {type: mongoose.Types.ObjectId, default: ''} // MongoDB ID of the budget group that this transaction is in
});

const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
