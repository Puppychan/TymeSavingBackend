import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import mongoose from "mongoose";

export const addTransactions = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - Transaction.csv';
    try {
        let data = await readCSV(filePath);
        data = data.map(transaction => {
            // handle empty savingGroupId
            if (transaction.savingGroupId && mongoose.Types.ObjectId.isValid(transaction.savingGroupId)) {
                transaction.savingGroupId = new mongoose.Types.ObjectId(transaction.savingGroupId);
            } else {
                delete transaction.savingGroupId;  // Remove savingGroupId if it's invalid
            }
            // handle empty budgetGroupId
            if (transaction.budgetGroupId && mongoose.Types.ObjectId.isValid(transaction.budgetGroupId)) {
                transaction.budgetGroupId = new mongoose.Types.ObjectId(transaction.budgetGroupId);
            } else {
                delete transaction.budgetGroupId;  // Remove savingGroupId if it's invalid
            }
            if(!transaction.approveStatus){
                delete transaction.approveStatus;
            }

            if (transaction.transactionImages) {
                transaction.transactionImages = transaction.transactionImages.split(';').map(link => link.trim());
            }
            return transaction;
        });
        await Transaction.insertMany(data);
        console.log('Transactions inserted successfully');
    } catch (error){
        console.log("Transactions read error: " + error)
    }
}

addTransactions();