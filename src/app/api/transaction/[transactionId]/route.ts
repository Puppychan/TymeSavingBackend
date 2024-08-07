import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { ITransaction } from "src/models/transaction/interface";
import Transaction from "src/models/transaction/model";
import { addHours } from 'date-fns'
import { startSession } from "mongoose";
import { localDate } from "src/lib/datetime";
import { deleteTransactionSharedBudget, updateTransactionSharedBudget } from "src/lib/sharedBudgetUtils";
import { updateTransactionGroupSaving, deleteTransactionGroupSaving } from "src/lib/groupSavingUtils";

// IMPORTANT: transactionId here is the transaction's assigned MongoDB ID

/*
    GET: Read one transaction details
    PUT: Update transaction details
    DELETE: Delete transaction
*/

// READ the transaction details
export const GET = async(req: NextRequest, { params }: { params: { transactionId: string } }) => {
    try{
        await connectMongoDB();
        const transaction = await Transaction.findById({ _id: params.transactionId });
        if (!transaction) {
            return NextResponse.json({ response: "Transaction not found" }, { status: 404 });
        }

        return NextResponse.json({ response: transaction }, { status: 200 });
    }
    catch (error: any) {
        return NextResponse.json({ response: error.message }, { status: 500 });
    }
}

// UPDATE transaction details
export const PUT = async(req: NextRequest, { params }: { params: {transactionId: string} }) => {
    await connectMongoDB();
    const dbSession = await startSession();
    dbSession.startTransaction();
    try {
        const payload = await req.json() as Partial<ITransaction> //payload = newUser
        const transaction = await Transaction.findOne({ _id: params.transactionId });
        if (!transaction) {
          return NextResponse.json({ response: 'Transaction not found' }, { status: 404 });
        }
        const oldAmount = transaction.amount; // get the amount before update

        const updateQuery: any = {};
        Object.keys(payload).forEach(key => {
            updateQuery[`${key}`] = payload[key as keyof ITransaction];
        });

        // If the type changes while this transaction belongs to a Shared Budget or a Group Saving
        if((transaction.budgetGroupId || updateQuery.budgetGroupId) && updateQuery.type && updateQuery.type === 'Income'){
            return NextResponse.json(
                { response: 'Transaction is in Shared Budget, cannot change to Income!' }, 
                { status: 400 }
            );
        }
        if((transaction.savingGroupId || updateQuery.savingGroupId) && updateQuery.type && updateQuery.type === 'Expense'){
            return NextResponse.json(
                { response: 'Transaction is in Group Saving, cannot change to Expense!' }, 
                { status: 400 }
            );
        }
  
        const updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: params.transactionId },
            { 
                $set: updateQuery,
                editedDate: localDate(new Date())
            },
            {
                new: true,
                runValidators: true,
            }
        );
        // Amount changes -> Update groups
        if (oldAmount != updatedTransaction.amount){
            if (updatedTransaction.budgetGroupId){
                await updateTransactionSharedBudget(params.transactionId, oldAmount);
            }
            else if (updatedTransaction.savingGroupId){
                await updateTransactionGroupSaving(params.transactionId, oldAmount);
            }
        }
        
        await dbSession.commitTransaction();  // Commit the transaction
        await dbSession.endSession();  // End the session
        return NextResponse.json({ response: updatedTransaction }, { status: 200 });
    } catch (error: any) {
        await dbSession.abortTransaction();  // Commit the transaction
        await dbSession.endSession();  // End the session
        console.log('Error updating user:', error);
        return NextResponse.json({ response: 'Cannot update transaction with id ' + params.transactionId }, { status: 500 });
    }
}

// DELETE transaction
export const DELETE = async(req: NextRequest, { params }: { params: { transactionId: string } }) => {
    const transactionId = params.transactionId;
    await connectMongoDB();
    const dbSession = await startSession();
    dbSession.startTransaction();
    try {
        const query_transaction = await Transaction.findOne({ _id: transactionId });
        if (query_transaction) {
            // Add the amount back to the budget group
            if (query_transaction.budgetGroupId){
                await deleteTransactionSharedBudget(params.transactionId, query_transaction.amount);
            }          
            // Deduct the amount from the saving group
            else if (query_transaction.savingGroupId){
                await deleteTransactionGroupSaving(params.transactionId, query_transaction.amount);
            }

            // Delete the transaction
            await Transaction.deleteOne({ _id: transactionId });

            await dbSession.commitTransaction();  // Commit the transaction
            await dbSession.endSession();  // End the session
            return NextResponse.json(
                { response: "Transaction deleted successfully." },
                { status: 200 }
            );
        } else {
            return NextResponse.json({ response: "No such transaction." }, { status: 404 });
        }
    } catch (error) {
        console.log(error);
        await dbSession.abortTransaction();  // Abort the transaction
        await dbSession.endSession();  // End the session
        return NextResponse.json(
        { response: "Transaction with id " + transactionId + " could not be deleted." },
        { status: 500 }
        );
    }
}