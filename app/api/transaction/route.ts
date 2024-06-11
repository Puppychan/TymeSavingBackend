import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "../../../config/connectMongoDB";
import Transaction from "../../../models/transaction/model";
import {TransactionType} from "../../../models/transaction/interface"

/*
    POST: Create a transaction
    GET: For admins to view all transaction details - may change this route
        Sort transactions: tentative list
            sortDateCreated
            sortDateUpdated
            sortUserCreated
            sortAmount
        Filter transactions: tentative list
            filterDateCreatedBefore
            filterDateCreatedAfter
            filterAmountBelow
            filterAmountAbove
    PUT: read csv file into DB
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
            createdDate = Date.now();
        }
        if(!editedDate){
            editedDate = Date.now();
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