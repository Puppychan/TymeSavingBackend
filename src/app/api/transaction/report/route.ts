export const dynamic = 'force-dynamic'; // <- add this to force dynamic render
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import {TransactionType} from "src/models/transaction/interface"
import { currentMonthTotal, pastMonthsTotal, compareToLastMonth, topCategories } from "src/lib/fetchTransaction";


// Call functions based on the parameters. Functions are: (May add more)
// 1) currentMonthTotal: total expense/income of current month i.e. From the 1st to the current date. 
//      params: transactionType: "Income" or "Expense"
//      return: amount + month
// 2) pastMonthTotal: total income/expense of past 5 months: from the 1st to the end of that month. 
//      params: transactionType: "Income" or "Expense"
//      return: amount + month
// 3) compareToLastMonth: Total income and expense for this month. Compare them to the last month
//      return: { total income for this month, percentage compared to the last month },
//              { total expense for this month, percentage compared to the last month }
// 4) topCategories: Group categories for this month. Top 3 categories + Group the others as "Other"
//      params: transactionType: "Income" or "Expense"
//      return: [{ category, total amount, percentage }]
// req format: {functionName: functionName, param1: value1, ... }
export const GET = async (req: NextRequest) => {
    try {
        await connectMongoDB();
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams:  { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        console.log(vnpParams);
        switch (vnpParams["functionName"]){
            case "currentMonthTotal":   //done
                var { status, response } = await currentMonthTotal(vnpParams["transactionType"]);
                return NextResponse.json({response: response}, {status: status});
            case "pastMonthsTotal":      //done
                var { status, response } = await pastMonthsTotal(vnpParams["transactionType"]);
                return NextResponse.json({response: response}, {status: status});
            case "compareToLastMonth":  //done - in percentage already, just add %
                var { status, response } = await compareToLastMonth();
                return NextResponse.json({response: response}, {status: status});
            case "topCategories":       //for this month only
                var { status, response } = await topCategories(vnpParams["transactionType"]);
                return NextResponse.json({response: response}, {status: status});
        }
    } catch (error){
        return NextResponse.json({response: error}, {status: 500});
    }
}