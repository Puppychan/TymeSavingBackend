export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { currentMonthTotal, pastMonthsTotal, compareToLastMonth, topCategories, netSpend } from "src/lib/fetchTransaction";

// Call functions based on the parameters. Functions are: (May add more)
// 1) currentMonthTotal: total expense/income of current month i.e. From the 1st to the current date. 
//      params: transactionType: "Income" or "Expense"
//              userId
//      return: amount + month
// 2) pastMonthTotal: total income/expense of past 5 months: from the 1st to the end of that month. 
//      params: transactionType: "Income" or "Expense"
//              userId
//      return: amount + month
// 3) compareToLastMonth: Total income and expense for this month. Compare them to the last month
//      params: userId
//      return: { total income for this month, percentage compared to the last month },
//              { total expense for this month, percentage compared to the last month }
// 4) topCategories: Group categories for this month. Top 3 categories + Group the others as "Other"
//      params: transactionType: "Income" or "Expense"
//              userId
//      return: [{ category, total amount, percentage }]
// 5) netSpend: total income - total expense for this month
//      params: userId
// req format: {transactionType: Income | Expense, userId}
export const GET = async (req: NextRequest) => {
    try {
        await connectMongoDB();
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams:  { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        console.log(vnpParams);
        var response = {
            transactionType: vnpParams["transactionType"], 
            currentMonthTotal, pastMonthsTotal, compareToLastMonth, topCategories, netSpend
        };
        response.currentMonthTotal = 
            (await currentMonthTotal(vnpParams["transactionType"], vnpParams["userId"])).response;
        response.pastMonthsTotal = 
            (await pastMonthsTotal(vnpParams["transactionType"], vnpParams["userId"])).response;
        response.compareToLastMonth =
            (await compareToLastMonth(vnpParams["userId"])).response;
        response.topCategories = 
            (await topCategories(vnpParams["transactionType"], vnpParams["userId"])).response;
        console.log(response);
        response.netSpend = (await netSpend(vnpParams["userId"])).response;
        return NextResponse.json({response: response}, {status: 200});
    } catch (error){
        return NextResponse.json({response: error}, {status: 500});
    }
}