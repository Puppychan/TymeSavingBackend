import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import {TransactionType} from "src/models/transaction/interface"
import { formatISO } from "date-fns";
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
            transactionImages,payBy, category, savingId, budgetId} = payload;
        let newType = TransactionType.Expense;
        if (type == 'Income'){
            newType = TransactionType.Income;
        }
        if(!createdDate){
            createdDate = new Date(formatISO(Date.now()));
        }
        if(!editedDate){
            editedDate = new Date(formatISO(Date.now()));
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
            savingId: savingId,
            budgetId: budgetId
        });
        await newTransaction.save();
        return NextResponse.json({response: newTransaction, status: 200});
    }
    catch (error: any) {
        return NextResponse.json({ response: error.message}, { status: 500 });
    }
}
