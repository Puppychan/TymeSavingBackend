import { startOfMonth, endOfToday } from 'date-fns';
import { connectMongoDB } from 'src/config/connectMongoDB';
import Transaction from 'src/models/transaction/model';
import { NextResponse } from 'next/server';
// total expense/income of current month: From the 1st to the current date
// return amount + month
export const currentMonthTotal = async(type: String) =>{
    try {    
        const currentDate = new Date();
        const firstDayOfMonth = startOfMonth(currentDate);
        await connectMongoDB();

        // Construct the aggregation pipeline
        const pipeline = [
            {
                $match: {
                    createdDate: {
                        $gte: firstDayOfMonth,
                        $lt: currentDate
                    },
                    type: type
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                } 
            }
        ];

        // Fetch the transactions
        const result = await Transaction.aggregate(pipeline);

        if (result.length > 0) {
            console.log(`Total amount for type ${type}:`, result[0].totalAmount);
        } else {
            console.log(`No transactions found for type ${type} in the current month.`);
        }

        // Return the result
        return {
            status: 200,
            response: result.length > 0 ? result[0] : { totalAmount: 0 }
        };
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return {
            status: 500,
            response: error
        };
    }
}


// total expense of past month: from the 1st to the end of that month
// return amount + month
export const pastMonthTotal = async(type: "Income" | "Expense", monthPast: number) =>{
    
}



// Total income and expense for this month. Compare them to the last month
// return: total income for this month, percentage compared to the last month
// return: total expense for this month, percentage compared to the last month
export const compareToLastMonth = async() => {

}

// Group category for this month
// Top 3 categories + Group the others as "Other"
// return: {category, total amount, percentage}
export const topCategoriesExpense = async() => {

}
