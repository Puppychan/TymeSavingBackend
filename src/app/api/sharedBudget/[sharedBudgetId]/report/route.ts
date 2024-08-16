import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
// Schemas
import SharedBudget from "src/models/sharedBudget/model";
import { UserRole } from "src/models/user/interface";
// Functions
import { groupReportCategories, groupReportUsers, groupReportTransactions } from "src/lib/fetchTransactionGroupReport";
import { verifyMember } from "src/lib/sharedBudgetUtils";
import { verifyAuth } from "src/lib/authentication";

// routes for SharedBudget report
export const GET = async(req: NextRequest, { params }: { params: { sharedBudgetId: string }}) => {
  try{
    await connectMongoDB();
    const groupType = 'budgetGroup';
    const groupId = params.sharedBudgetId;
    // Filter to show transactions. Default: show latest transactions.
    const searchParams = req.nextUrl.searchParams;
    let filter = searchParams.get('filter') ?? 'latest';
    // Verify accessing user
    const verification = await verifyAuth(req.headers);
    if (verification.status !== 200) {
      return NextResponse.json({ response: "SharedBudgetReport: " + verification.response }, { status: verification.status });
    }
    const authUser = verification.response;

    if (authUser.role !== UserRole.Admin) {
      const isMember = await verifyMember(authUser._id, params.sharedBudgetId)
      if (!isMember)
        return NextResponse.json({ response: 'SharedBudgetReport: This user is neither an admin nor a member of the shared budget' }, { status: 401 });
    }

    const sharedBudget = await SharedBudget.findById(groupId);
    if(!sharedBudget){
      throw "SharedBudgetReport: Cannot find SharedBudget";
    }
    var response = {categories: [], users: [], transactions: []};
    response.categories = await groupReportCategories(groupType, groupId);
    response.users = await groupReportUsers(groupType, groupId);
    response.transactions = await groupReportTransactions(groupType, groupId, filter);

    return NextResponse.json({ response: response }, { status: 200 });
  }
  catch (error: any) {
      return NextResponse.json({ response: error.message }, { status: 500 });
  }
}