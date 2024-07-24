import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { IChallengeCheckpoint } from "src/models/challengeCheckpoint/interface";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import FinancialChallenge from "src/models/financialChallenge/model";

export const PUT = async (req: NextRequest, { params }: { params: { challengeId: string , checkpointId}}) => {
  const dbSession = await startSession();
  dbSession.startTransaction();

  try {
    await connectMongoDB();
    
    const verification = await verifyAuth(req.headers)
    if (verification.status !== 200) {
      return NextResponse.json({ response: verification.response }, { status: verification.status });
    }

    const user = verification.response;

    const payload = await req.json() as Partial<IChallengeCheckpoint>

    const updateQuery: any = {};
    Object.keys(payload).forEach(key => {
      updateQuery[`${key}`] = payload[key as keyof IChallengeCheckpoint];
    });

    const updated = await ChallengeCheckpoint.findOneAndUpdate(
      { _id: params.checkpointId, challengeId: params.challengeId },
      { $set: updateQuery },
      {
        new: true,
        runValidators: true,
        session: dbSession
      }
    );

    if (!updated) {
      return NextResponse.json({ response: 'Either challenge not found, or The checkpoint isnt belong to this challenge' }, { status: 404 });
    }
      
    await dbSession.commitTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    return  NextResponse.json({ response: updated }, { status: 200 });
  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    dbSession.endSession();  // End the session

    console.log("Error creating checkpoint: ", error);
    return NextResponse.json({ response: 'Failed to create checkpoint'}, { status: 500 });
  }
};