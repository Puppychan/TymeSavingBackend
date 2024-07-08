import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import {TransactionType} from "src/models/transaction/interface"
import { localDate } from 'src/lib/datetime';
import { changeSavingGroupBalance } from "src/lib/groupSavingUtils";
import { changeBudgetGroupBalance } from "src/lib/sharedBudgetUtils";
/*
    POST: Create a transaction
*/

export const POST = async (req:NextRequest) => {
    try{
        await connectMongoDB();
        const payload = await req.json()
        // Transaction.id will be auto assigned by MongoDB
        // createdDate and editedDate are auto assigned to now
        var {userId, createdDate, editedDate,description, type,amount,
            transactionImages,payBy, category, savingGroupId, budgetGroupId} = payload;
        let newType = TransactionType.Expense;
        if (type == 'Income'){
            newType = TransactionType.Income;
        }
        if(!createdDate){
            createdDate = localDate(new Date());
        }
        if(!editedDate){
            editedDate = localDate(new Date());
        }

        const newTransaction = new Transaction({
            userId: userId,
            createdDate: createdDate,
            editedDate: editedDate,
            description: description,
            type: newType,
            amount: amount,
            transactionImages: transactionImages,
            payBy: payBy,
            category: category,
            savingGroupId: savingGroupId,
            budgetGroupId: budgetGroupId
        });
        await newTransaction.save();

        // Change the group balance (Only if the transaction is associated with a group)
        if (savingGroupId){
            await changeSavingGroupBalance(newTransaction._id);
        }
        if (budgetGroupId) {
            await changeBudgetGroupBalance(newTransaction._id);
        }

        return NextResponse.json({response: newTransaction, status: 200});
    }
    catch (error: any) {
        return NextResponse.json({ response: error.message}, { status: 500 });
    }
}
