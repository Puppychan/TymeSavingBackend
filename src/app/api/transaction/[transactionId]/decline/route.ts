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
import { changeApproveStatus } from "src/lib/fetchTransaction";

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

      const message = await changeApproveStatus(params.transactionId, 'Declined', authUser);
      return NextResponse.json({ response: message }, { status: 200 });
    }
    catch (error: any) {
      dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json({ response: 'Failed to decline: ' + error }, { status: 500 });
    }
}