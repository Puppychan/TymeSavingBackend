import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { changeApproveStatus } from "src/lib/fetchTransaction";
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

    const message = await changeApproveStatus(params.transactionId, 'Approved', authUser);
    
    return NextResponse.json({ response: message }, { status: 200 });
  }
    catch (error: any) {
      dbSession.abortTransaction();
      dbSession.endSession();
      return NextResponse.json({ response: error.message ?? error }, { status: 500 });
    }
}