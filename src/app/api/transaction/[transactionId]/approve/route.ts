import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import { localDate } from "src/lib/datetime";
import { changeBudgetGroupBalance, revertTransactionSharedBudget } from "src/lib/sharedBudgetUtils";
import { revertTransactionGroupSaving, changeSavingGroupBalance } from "src/lib/groupSavingUtils";
import { verifyAuth } from "src/lib/authentication";
import SharedBudget from "src/models/sharedBudget/model";
import GroupSaving from "src/models/groupSaving/model";
import { startSession } from "mongoose";

// IMPORTANT: transactionId here is the transaction's assigned MongoDB ID

/*
    POST: Group host can approve a transaction -> Modify group concurrentAmount
*/

export const POST = async(req: NextRequest, { params }: { params: { transactionId: string } }) => {
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();
  try{        
      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      // User is logged in.
      const authUser = verification.response;
      
      const transaction = await Transaction.findById({ _id: params.transactionId });
      if (!transaction) {
        return NextResponse.json({ response: "Transaction not found" }, { status: 404 });
      }
      if(transaction.approveStatus === "Approved")
        return NextResponse.json({ response: "Transaction is already approved" }, { status: 500 });

      // Handle SharedBudget
      if(transaction.budgetGroupId){
        const sharedBudget = await SharedBudget.findById(transaction.budgetGroupId);
        if (!sharedBudget) {
          return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
        }
        if ((authUser.role != 'Admin') && (authUser._id.toString() !== sharedBudget.hostedBy.toString())) {
          return NextResponse.json({ response: 'Only an Admin or the Host can approve this transaction.' }, { status: 401 });
        }
        // Deduct the amount from SharedBudget
        await changeBudgetGroupBalance(transaction._id);
        // change the transaction.approveStatus to "Approved"
        transaction.approveStatus = "Approved";
        await transaction.save();
      }
      else if(transaction.savingGroupId){ // Handle GroupSaving
        const groupSaving = await GroupSaving.findById(transaction.savingGroupId);
        if (!groupSaving) {
          return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
        }
        if ((authUser.role != 'Admin') && (authUser._id.toString() !== groupSaving.hostedBy.toString())) {
          return NextResponse.json({ response: 'Only an Admin or the Host can approve this transaction.' }, { status: 401 });
        }
        // Deduct the amount from SharedBudget
        await changeSavingGroupBalance(transaction._id);
        // change the transaction.approveStatus to "Approved"
        transaction.approveStatus = "Approved";
        await transaction.save();
      }
      dbSession.commitTransaction();
      dbSession.endSession();
      return NextResponse.json({ response: transaction }, { status: 200 });
    }
    catch (error: any) {
      dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json({ response: error.message }, { status: 500 });
    }
}