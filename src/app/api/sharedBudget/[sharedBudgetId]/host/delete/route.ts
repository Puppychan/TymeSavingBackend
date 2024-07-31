import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { checkDeletableSharedBudget } from "src/lib/sharedBudgetUtils";
import SharedBudget from "src/models/sharedBudget/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";

// DELETE: delete a shared budget (available only for the Host of the shared budget)
// TODO: CHECK IF THERE IS ANY TRANSACTION ASSOCIATED WITH THIS SHARED BUDGET
export const DELETE = async (req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  const dbSession = await startSession();
  dbSession.startTransaction();

  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      const sharedBudget = await SharedBudget.findById(params.sharedBudgetId)
      if (!sharedBudget) {
        return NextResponse.json({ response: 'Shared Budget not found' }, { status: 404 });
      }

      if (authUser._id.toString() !== sharedBudget.hostedBy.toString()) {
        return NextResponse.json({ response: 'Only the Host can delete this shared budget' }, { status: 401 });
      }

      const deletable = await checkDeletableSharedBudget(params.sharedBudgetId)
      if (!deletable) {
        return NextResponse.json({ response: 'Cannot delete this shared budget as there are transactions associated with it' }, { status: 400 });
      }

      await SharedBudgetParticipation.deleteMany({ sharedBudget: params.sharedBudgetId }).session(dbSession)
      await SharedBudget.findOneAndDelete({ _id: params.sharedBudgetId}).session(dbSession)

      await dbSession.commitTransaction();  // Commit the transaction
      await dbSession.endSession();  // End the session
      
      return NextResponse.json({ response: 'Deleted successfully' }, { status: 200 });

  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    console.log('Error deleting shared budget:', error);
    return NextResponse.json({ response: 'Failed to delete shared budget'}, { status: 500 });
  }
};
