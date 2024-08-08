import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { ITransaction } from "src/models/transaction/interface";
import Transaction from "src/models/transaction/model";
import { addHours } from 'date-fns'
import { startSession } from "mongoose";
import { localDate } from "src/lib/datetime";
import { changeBudgetGroupBalance, deleteTransactionSharedBudget, updateTransactionSharedBudget } from "src/lib/sharedBudgetUtils";
import { updateTransactionGroupSaving, deleteTransactionGroupSaving, changeSavingGroupBalance } from "src/lib/groupSavingUtils";

// IMPORTANT: transactionId here is the transaction's assigned MongoDB ID

/*
    POST: Group host can approve a transaction -> Modify group concurrentAmount
*/

export const POST = async(req: NextRequest, { params }: { params: { transactionId: string } }) => {
    try{
        await connectMongoDB();
        const transaction = await Transaction.findById({ _id: params.transactionId });
        if (!transaction) {
          return NextResponse.json({ response: "Transaction not found" }, { status: 404 });
        }
        if(transaction.approveStatus === "Approved")
          return NextResponse.json({ response: "Transaction is already approved" }, { status: 500 });

        // Add the amount to GroupSaving; Deduct the amount from SharedBudget
        if(transaction.savingGroupId){
          // Add the amount to GroupSaving
          await changeSavingGroupBalance(transaction._id);
          // change the transaction.approveStatus to "Approved"
          transaction.approveStatus = "Approved";
          await transaction.save();
        }
        else if (transaction.budgetGroupId){
          // Deduct the amount from SharedBudget
          await changeBudgetGroupBalance(transaction._id);
          // change the transaction.approveStatus to "Approved"
          transaction.approveStatus = "Approved";
          await transaction.save();
        }

        return NextResponse.json({ response: transaction }, { status: 200 });
    }
    catch (error: any) {
        return NextResponse.json({ response: error.message }, { status: 500 });
    }
}