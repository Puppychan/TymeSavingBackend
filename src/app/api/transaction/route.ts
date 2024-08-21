import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import {TransactionType} from "src/models/transaction/interface"
import { localDate } from 'src/lib/datetime';
import { changeSavingGroupBalance, checkGroupSavingClosed } from "src/lib/groupSavingUtils";
import { changeBudgetGroupBalance, checkSharedBudgetClosed } from "src/lib/sharedBudgetUtils";
import { updateUserPoints } from "src/lib/userUtils";
import { startSession } from "mongoose";
import GroupSaving from "src/models/groupSaving/model";
import SharedBudget from "src/models/sharedBudget/model";
import { createTransactionChallenge } from "src/lib/financialChallengeUtils";
/*
    POST: Create a transaction
*/

export const POST = async (req:NextRequest) => {
    await connectMongoDB();

    const dbSession = await startSession();
    dbSession.startTransaction();
  
    try{
        const payload = await req.json()
        // Transaction.id will be auto assigned by MongoDB
        // createdDate and editedDate are auto assigned to now
        var {userId, createdDate, editedDate,description, type,amount,
            transactionImages,payBy, category, savingGroupId, budgetGroupId, approveStatus} = payload;
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
        // Check group ID; Fetch the group's default approve status ("Approved" vs "Declined")
        if(savingGroupId){
            console.log("Creating a transaction to " + savingGroupId);
            const savingGroup = await GroupSaving.findById(savingGroupId);
            if(!savingGroup){
                return NextResponse.json({response: "No such Group Saving", status: 404});
            }
            // Check if the group has been closed or expired
            await checkGroupSavingClosed(savingGroupId);
            approveStatus = savingGroup.defaultApproveStatus;
        }
        if(budgetGroupId){
            console.log("Creating a transaction to " + budgetGroupId);
            const budgetGroup = await SharedBudget.findById(budgetGroupId);
            if(!budgetGroup){
                return NextResponse.json({response: "No such Shared Budget", status: 404});
            }
            await checkSharedBudgetClosed(budgetGroupId);
            approveStatus = budgetGroup.defaultApproveStatus;
        }
        if (amount) amount = parseInt(amount, 10);
        else amount = 0;
        
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
            budgetGroupId: budgetGroupId,
            approveStatus: approveStatus
        });
        await newTransaction.save();
        // Update SharedBudget, GroupSaving, and corresponding challenges

        // Change the group balance
        // Only if the transaction is associated with a group
        // And the group auto-approve transactions
        if (savingGroupId && approveStatus === 'Approved'){
            await changeSavingGroupBalance(newTransaction._id);
        }
        if (budgetGroupId && approveStatus === 'Approved') {
            await changeBudgetGroupBalance(newTransaction._id);
        }
        await createTransactionChallenge(newTransaction._id); // attempt to update challenge progress
        await dbSession.commitTransaction();  // Commit the transaction
        await dbSession.endSession();  // End the session
        
        return NextResponse.json({response: newTransaction, status: 200});
    }
    catch (error: any) {
        await dbSession.abortTransaction();  // Abort the transaction
        await dbSession.endSession();  // End the session

        return NextResponse.json({ response: error.message}, { status: 500 });
    }
}
