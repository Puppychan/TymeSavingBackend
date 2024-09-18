import { startSession } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyAuth } from "src/lib/authentication";
import { checkDeletableGroupSaving } from "src/lib/groupSavingUtils";
import GroupSaving from "src/models/groupSaving/model";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import { UserRole } from "src/models/user/interface";

// DELETE: delete a group saving (available only for the Host of the group saving)
// TODO: CHECK IF THERE IS ANY TRANSACTION ASSOCIATED WITH THIS SHARED BUDGET
export const DELETE = async (req: NextRequest, { params }: { params: { groupId: string }}) => {
  const dbSession = await startSession();
  dbSession.startTransaction();

  try {
      await connectMongoDB();

      const verification = await verifyAuth(req.headers)
      if (verification.status !== 200) {
        return NextResponse.json({ response: verification.response }, { status: verification.status });
      }

      const authUser = verification.response;

      const group = await GroupSaving.findById(params.groupId)
      if (!group) {
        return NextResponse.json({ response: 'Group Saving not found' }, { status: 404 });
      }

      if (authUser.role !== UserRole.Admin) {
        if (authUser._id.toString() !== group.hostedBy.toString()) {
          return NextResponse.json({ response: 'Only the Host and Admin can edit this group saving' }, { status: 401 });
        }
      }

      const deletable = await checkDeletableGroupSaving(params.groupId)
      if (!deletable) {
        return NextResponse.json({ response: 'Cannot delete this group saving as there are transactions associated with it' }, { status: 400 });
      }

      await GroupSavingParticipation.deleteMany({ groupSaving: params.groupId }, {session: dbSession});
      await GroupSaving.findOneAndDelete({ _id: params.groupId}, { session: dbSession });

      await dbSession.commitTransaction();  // Commit the transaction
      await dbSession.endSession();  // End the session
      
      return NextResponse.json({ response: 'Deleted successfully' }, { status: 200 });

  } catch (error: any) {
    await dbSession.abortTransaction();  // Commit the transaction
    await dbSession.endSession();  // End the session

    console.log('Error deleting group saving:', error);
    return NextResponse.json({ response: 'Failed to delete group saving'}, { status: 500 });
  }
};
