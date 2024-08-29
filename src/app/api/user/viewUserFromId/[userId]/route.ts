export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { verifyUser, newToken } from "src/lib/authentication";
import User from "src/models/user/model";
import SharedBudget from "src/models/sharedBudget/model";
import GroupSaving from "src/models/groupSaving/model";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import Transaction from "src/models/transaction/model";
import { ObjectId } from "mongodb";

// GET: Read the shortened user information - used when viewed by other users
export const GET = async (
  req: NextRequest,
  { params }: { params: { userId: string } }
) => {
  try {
    await connectMongoDB();
    const userId = params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ response: "User not found" }, { status: 404 });
    }
    // May pass sharedBudgetId or groupSavingId to view this user's contribution
    let urlSearchParams = req.nextUrl.searchParams;
    let vnpParams: { [key: string]: string } = {};
    urlSearchParams.forEach((value, key) => {
        vnpParams[key] = value;
    });
    let token = newToken(user);
    // Convert the user document to a plain JavaScript object and remove the password field
    let objectUser = user.toObject();
    let returnUser = {
      _id: objectUser._id,
      username: objectUser.username,
      email: objectUser.email,
      phone: objectUser.phone,
      fullname: objectUser.fullname,
      avatar: objectUser.avatar,
    } as any;
    if (vnpParams["sharedBudgetId"]){
      const sharedBudget = await SharedBudget.findById(vnpParams["sharedBudgetId"]);
      if(!sharedBudget){
        return NextResponse.json({ response: "No such Shared Budget with this ID" }, { status: 404 });
      }
      // if sharedBudget: show the totalAmount that this user has made in this group; number of transactions
      // Find transactions for the user in the shared budget
      // const incomeTransactions = await Transaction.find({ 
      //   budgetGroupId: new ObjectId(vnpParams["sharedBudgetId"]), 
      //   userId: new ObjectId(userId),
      //   type: 'Income'
      // })
      // .populate('userId', '_id username fullname')
      // .sort({ createdDate: -1 });
      const expenseTransactions = await Transaction.find({ 
        budgetGroupId: new ObjectId(vnpParams["sharedBudgetId"]), 
        userId: new ObjectId(userId),
        type: 'Expense'
      })
      .populate('userId', '_id username fullname userPoints tymeReward')
      .sort({ createdDate: -1 });

      // Calculate the total amount and number of transactions
      returnUser.totalIncome = 0;
      returnUser.totalExpense = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      returnUser.transactionCount = expenseTransactions.length;
    }

    if (vnpParams["groupSavingId"]){
      const groupSaving = await GroupSaving.findById(vnpParams["groupSavingId"]);
      if(!groupSaving){
        return NextResponse.json({ response: "No such Group Saving with this ID" }, { status: 404 });
      }
      // if groupSaving: show the totalAmount that this user has made in this group; number of transactions
      // Find transactions for the user in the groupSaving
      const incomeTransactions = await Transaction.find({ 
        savingGroupId: new ObjectId(vnpParams["groupSavingId"]), 
        userId: new ObjectId(userId),
        type: 'Income'
      })
      .populate('userId', '_id username fullname userPoints tymeReward')
      .sort({ createdDate: -1 });

      // Calculate the total amount and number of transactions
      returnUser.totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      returnUser.totalExpense = 0;
      returnUser.transactionCount = incomeTransactions.length;
    }
    return NextResponse.json({ response: returnUser }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ response: error.message }, { status: 500 });
  }
};