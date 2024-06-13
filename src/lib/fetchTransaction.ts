import { connectMongoDB } from 'src/config/connectMongoDB';
import Transaction from 'src/models/transaction/model';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { PipelineStage } from 'mongoose';
import mongoose from 'mongoose';

// Add userId == some user ID and we cool

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
// req format: {transactionType: Income | Expense, userId}
// 5) netSpend: total income - total expense for this month
//      params: userId


// total expense/income of current month: From the 1st to the current date
// return amount + month
export const currentMonthTotal = async(type: String, currentUserId: string): Promise<{status: number, response: any}> =>{
    try {    
        const currentDate = new Date();
        const firstDayOfMonth = startOfMonth(currentDate);
        const currentMonth = format(currentDate, 'MMM').toUpperCase(); // get JUN instead of Jun
        await connectMongoDB();
        const userId = new mongoose.Types.ObjectId(currentUserId);
        // Construct the aggregation pipeline
        const pipeline = [
            {
                $match: {
                    createdDate: {
                        $gte: firstDayOfMonth,
                        $lt: currentDate
                    },
                    type: type, 
                    userId: userId
                }
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' }
                } 
            },
            {
                $project: {
                    _id: 0, // Exclude _id
                    totalAmount: 1,
                }
            }
        ];
        const result = await Transaction.aggregate(pipeline);

        const response = {
            totalAmount: result.length > 0 ? result[0].totalAmount : 0,
            currentMonth: currentMonth
        };

        if (result.length > 0) {
            console.log(`Total amount for type ${type}:`, response.totalAmount);
        } else {
            console.log(`No transactions found for type ${type} in the current month.`);
        }

        // Return the result
        return {
            status: 200,
            response: response
        };
    } catch (error) {
        console.error('currentMonthTotal: Error fetching transactions:', error);
        return {
            status: 500,
            response: error
        };
    }
}

// export const lastFiveMonths = async (transactionType: String) => {
export const pastMonthsTotal = async (transactionType: String, currentUserId: string): Promise<{status: number, response: any}> => {
    try {
        await connectMongoDB();
        const userId = new mongoose.Types.ObjectId(currentUserId);
        const currentDate = new Date();
        // length: number of months to show
        const months = Array.from({ length: 12 }, (_, i) => {
            const monthStart = startOfMonth(subMonths(currentDate, i));
            const monthEnd = i === 0 ? currentDate : endOfMonth(subMonths(currentDate, i));
            const monthLabel = format(monthStart, 'MMM').toUpperCase();; // Format month for labeling
            return {
                monthLabel,
                monthStart,
                monthEnd
            };
        });

        const result = await Promise.all(months.map(async ({ monthLabel, monthStart, monthEnd }) => {
            const [{ totalAmount } = { totalAmount: 0 }] = await Transaction.aggregate([
                {
                    $match: {
                        createdDate: {
                            $gte: monthStart,
                            $lt: monthEnd
                        },
                        type: transactionType, 
                        userId: userId
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$amount' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalAmount: 1
                    }
                }
            ]).exec();
            return {
                [monthLabel]: totalAmount
            };
        }));

        const summary = result.reduce((acc, item) => ({ ...acc, ...item }), {});

        console.log(summary);

        return {
            status: 200,
            response: summary
        };
    } catch (error) {
        console.error('pastMonthsTotal: Error fetching transactions:', error);
        return {
            status: 500,
            response: error
        };
    }
}

// Total income and expense for this month. Compare them to the last month
// return: total income for this month, percentage compared to the last month
// return: total expense for this month, percentage compared to the last month
export const compareToLastMonth = async(currentUserId: string): Promise<{status: number, response: any}> => {
    try {
        await connectMongoDB();
        const userId = new mongoose.Types.ObjectId(currentUserId);
        const currentDate = new Date();
        const firstDayOfThisMonth = startOfMonth(currentDate);
        const firstDayOfLastMonth = startOfMonth(subMonths(currentDate, 1));
        const endOfLastMonth = endOfMonth(subMonths(currentDate, 1));
        const pipeline = [
            {
                $facet: {
                    currentMonthIncome: [
                        {
                            $match: {
                                type: 'Income',
                                createdDate: {
                                    $gte: firstDayOfThisMonth,
                                    $lt: currentDate
                                }, 
                                userId: userId
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalAmount: { $sum: '$amount' }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalAmount: 1
                            }
                        }
                    ],
                    lastMonthIncome: [
                        {
                            $match: {
                                type: 'Income',
                                createdDate: {
                                    $gte: firstDayOfLastMonth,
                                    $lt: endOfLastMonth
                                }
                                , userId: userId
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalAmount: { $sum: '$amount' }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalAmount: 1
                            }
                        }
                    ],
                    currentMonthExpense: [
                        {
                            $match: {
                                type: 'Expense',
                                createdDate: {
                                    $gte: firstDayOfThisMonth,
                                    $lt: currentDate
                                }
                                , userId: userId
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalAmount: { $sum: '$amount' }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalAmount: 1
                            }
                        }
                    ],
                    lastMonthExpense: [
                        {
                            $match: {
                                type: 'Expense',
                                createdDate: {
                                    $gte: firstDayOfLastMonth,
                                    $lt: endOfLastMonth
                                }
                                , userId: userId
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalAmount: { $sum: '$amount' }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalAmount: 1
                            }
                        }
                    ]
                }
            }
        ];

        const result = await Transaction.aggregate(pipeline);

        const summary = {
            // month abbreviations
            currentMonth:format(firstDayOfThisMonth, 'MMM').toUpperCase(),
            lastMonth: format(firstDayOfLastMonth, 'MMM').toUpperCase(),
            // income
            currentMonthIncome: result[0].currentMonthIncome[0]?.totalAmount || 0,
            lastMonthIncome: result[0].lastMonthIncome[0]?.totalAmount || 0,
            // expense
            currentMonthExpense: result[0].currentMonthExpense[0]?.totalAmount || 0,
            lastMonthExpense: result[0].lastMonthExpense[0]?.totalAmount || 0,
        };

        // Percentage of this month amount vs last month amount: ((thisMonth - lastMonth) / lastMonth) * 100
        var incomePercentage = 0;
        var expensePercentage = 0;
        // Calculate percentage differences
        if (summary.lastMonthIncome !== 0) {
            incomePercentage = ((summary.currentMonthIncome - summary.lastMonthIncome) / summary.lastMonthIncome) * 100;
        } else {
            incomePercentage = summary.currentMonthIncome > 0 ? 100 : 0; // Handle cases where last month's income is zero
        }

        if (summary.lastMonthExpense !== 0) {
            expensePercentage = ((summary.currentMonthExpense - summary.lastMonthExpense) / summary.lastMonthExpense) * 100;
        } else {
            expensePercentage = summary.currentMonthExpense > 0 ? 100 : 0; // Handle cases where last month's expense is zero
        }

        return {
            status: 200,
            response: { "currentIncome": summary.currentMonthIncome, "incomePercentage": incomePercentage, 
                        "currentExpense": summary.currentMonthExpense, "expensePercentage": expensePercentage }
        };
    } catch (error) {
        console.error('compareToLastMonths: Error fetching transactions:', error);
        return {
            status: 500,
            response: error
        };
    }
}

// Group category for this month
// Top 3 categories + Group the others as "Other"
// return: {category, total amount, percentage}
export const topCategories = async(transactionType: String, currentUserId: string): Promise<{status: number, response: any}> => {
    try {
        await connectMongoDB();
        const userId = new mongoose.Types.ObjectId(currentUserId);
        const currentDate = new Date();
        const firstDayOfMonth = startOfMonth(currentDate);
        // First aggregation to get all categories with their total amounts
        const categoriesPipeline: PipelineStage[] = [
            {
                $match: {
                    type: transactionType, 
                    userId: userId,
                    createdDate: {
                        $gte: firstDayOfMonth,
                        $lt: currentDate
                    }
                }
            },
            {
                $group: {
                    _id: '$category',
                    totalAmount: { $sum: '$amount' }
                }
            },
            {
                $sort: {
                    totalAmount: -1
                }
            }
        ];

        const allCategories = await Transaction.aggregate(categoriesPipeline).exec();

        // Extract the top 3 categories
        const top3Categories = allCategories.slice(0, 3);

        // Calculate total amount of the top 3 categories
        const top3Total = top3Categories.reduce((acc, category) => acc + category.totalAmount, 0);

        // Total expenses (including top 3 and other)
        const totalExpense = allCategories.reduce((acc, category) => acc + category.totalAmount, 0);

        // Create summary for top 3 categories
        const top3Summary = top3Categories.map(item => ({
            category: item._id,
            totalAmount: item.totalAmount,
            percentage: totalExpense ? (item.totalAmount / totalExpense) * 100 : 0
        }));

        // Calculate the percentage for the "Other" category.
        const top3Percentage = top3Summary.reduce((acc, category) => acc + category.percentage, 0);
        const otherPercentage = 100 - top3Percentage;

        // If there are no transactions so far, return empty object immediately
        if (top3Percentage == 0){
            return {
                status: 200,
                response: null
            };
        }

        // Calculate the total amount for the "Other" category
        var otherTotal = totalExpense - top3Total;
        if (otherTotal < 0){
            otherTotal = 0;
        }

        // Create summary for "Other" category
        const otherSummary = {
            category: "Other",
            totalAmount: otherTotal,
            percentage: otherPercentage
        };

        // Merge top 3 and Other summaries into a single array
        top3Summary.push(otherSummary);

        console.log(top3Summary);
        return {
            status: 200,
            response: top3Summary
        };
    } catch (error) {
        console.error('topCategories: Error fetching transactions:', error);
        return {
            status: 500,
            response: 'topCategories: Error fetching transactions'
        };
    }
}

export const netSpend = async (currentUserId: string) =>{
    try {
        await connectMongoDB();
        const currentDate = new Date();
        const firstDayOfThisMonth = startOfMonth(currentDate);
        const userId = new mongoose.Types.ObjectId(currentUserId);
        const pipeline = [
            {
                $facet: {
                    currentMonthIncome: [
                        {
                            $match: {
                                type: 'Income',
                                createdDate: {
                                    $gte: firstDayOfThisMonth,
                                    $lt: currentDate
                                }, 
                                userId: userId
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalAmount: { $sum: '$amount' }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalAmount: 1
                            }
                        }
                    ],
                    currentMonthExpense: [
                        {
                            $match: {
                                type: 'Expense',
                                createdDate: {
                                    $gte: firstDayOfThisMonth,
                                    $lt: currentDate
                                }, 
                                userId: userId
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalAmount: { $sum: '$amount' }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalAmount: 1
                            }
                        }
                    ]
                }
            }
        ];
        const result = await Transaction.aggregate(pipeline).exec();
        const income = result[0].currentMonthIncome.length > 0 ? result[0].currentMonthIncome[0].totalAmount : 0;
        const expense = result[0].currentMonthExpense.length > 0 ? result[0].currentMonthExpense[0].totalAmount : 0;

        const netSpend = income - expense;

        console.log({
            currentMonthIncome: income,
            currentMonthExpense: expense,
            netSpend: netSpend
        });

        return {
            status: 200,
            response: {
                currentMonthIncome: income,
                currentMonthExpense: expense,
                netSpend: netSpend
            }
        };
    } catch (error){
        console.error('netspend: Error fetching transactions:', error);
        return {
            status: 500,
            response: error
        };
    }
}
