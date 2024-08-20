import mongoose, {Schema} from 'mongoose';
import { ITransaction, TransactionType, TransactionCategory, ApproveStatuses } from './interface';

// Define the schema for the user
const transactionSchema: Schema = new Schema({
    // MongoDB ID
    userId: {
      type: mongoose.Types.ObjectId, 
      ref: 'User',
      required: true
    },

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
    payBy: {type: String}, // payment methods e.g. cash

    // Let users manually input categories for now. Dropdown list later

    savingGroupId: {
      type: mongoose.Types.ObjectId,
      ref: 'GroupSaving'
    }, // MongoDB ID of the saving goals group that this transaction is in
    budgetGroupId: {
      type: mongoose.Types.ObjectId,
      ref: 'SharedBudget'
    }, // MongoDB ID of the shared budget group that this transaction is in

    category: {
      type: String,
      enum: Object.values(TransactionCategory),
      required: true
    },
    approveStatus:{ // Has this transaction been approved by the group's host?
      type: String,
      enum: ApproveStatuses
    }
});

const Transaction = mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', transactionSchema);

export default Transaction;
