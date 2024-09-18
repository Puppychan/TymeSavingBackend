import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
// Schemas
import GroupSaving from "src/models/groupSaving/model";
import { UserRole } from "src/models/user/interface";
// Functions
import { groupReportCategories, groupReportUsers, groupReportTransactions } from "src/lib/fetchTransactionGroupReport";
import { verifyMember } from "src/lib/groupSavingUtils";
import { verifyAuth } from "src/lib/authentication";

// routes for SharedBudget report
export const GET = async(req: NextRequest, { params }: { params: { groupId: string }}) => {
  try{
    await connectMongoDB();
    const groupType = 'savingGroup';
    const groupId = params.groupId;
    // Filter to show transactions. Default: show latest transactions.
    const searchParams = req.nextUrl.searchParams;
    let filter = searchParams.get('filter') ?? 'latest';
    // Verify accessing user
    const verification = await verifyAuth(req.headers);
    if (verification.status !== 200) {
      return NextResponse.json({ response: "GroupSavingReport: " + verification.response }, { status: verification.status });
    }
    const authUser = verification.response;

    if (authUser.role !== UserRole.Admin) {
      const isMember = await verifyMember(authUser._id, params.groupId)
      if (!isMember)
        return NextResponse.json({ response: 'GroupSavingReport: This user is neither an admin nor a member of the group saving' }, { status: 401 });
    }

    const groupSaving = await GroupSaving.findById(groupId);
    if(!groupSaving){
      return NextResponse.json({ response: 'GroupSavingReport: Cannot find GroupSaving' }, { status: 404 });
    }
    var response = {information: {}, categories: [], users: [], transactions: []};
    // Fetch basic information
    ['name', 'description', 'createdDate', 'endDate', 'concurrentAmount', 'amount'].forEach(key => {
      response.information[key] = groupSaving[key];
    });
    response.categories = await groupReportCategories(groupType, groupId);
    response.users = await groupReportUsers(groupType, groupId);
    response.transactions = await groupReportTransactions(groupType, groupId, filter);

    return NextResponse.json({ response: response }, { status: 200 });
  }
  catch (error: any) {
    return NextResponse.json({ response: "Failed to get report " + error }, { status: 500 });
  }
}