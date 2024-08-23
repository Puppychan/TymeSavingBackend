import { connectMongoDB } from 'src/config/connectMongoDB';
import Transaction from 'src/models/transaction/model';
import { startOfMonth, endOfMonth, subMonths, format, formatISO, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';
import { localDate } from './datetime';
import { PipelineStage, startSession } from 'mongoose';
import mongoose from 'mongoose';
import GroupSaving from 'src/models/groupSaving/model';
import SharedBudget from 'src/models/sharedBudget/model';
import { verifyAuth } from './authentication';
import { changeBudgetGroupBalance, revertTransactionSharedBudget } from './sharedBudgetUtils';
import { changeSavingGroupBalance, revertTransactionGroupSaving } from './groupSavingUtils';
import { match } from 'assert';
// Add userId == some user ID and we cool

/* Call functions based on the parameters. Functions are: (May add more)
1) currentMonthTotal: total expense/income of current month i.e. From the 1st to the current date. 
    params: transactionType: "Income" or "Expense"
            userId
    return: amount + month
2) pastMonthTotal: total income/expense of past 5 months: from the 1st to the end of that month. 
    params: transactionType: "Income" or "Expense"
            userId
    return: amount + month
3) compareToLastMonth: Total income and expense for this month. Compare them to the last month
    params: userId
    return: { total income for this month, percentage compared to the last month },
            { total expense for this month, percentage compared to the last month }
4) topCategories: Group categories for this month. Top 3 categories + Group the others as "Other"
    params: transactionType: "Income" or "Expense"
            userId
    return: [{ category, total amount, percentage }]
req format: {transactionType: Income | Expense, userId}
5) netSpend: total income minus total expense for this month
    params: userId
6) fetchTransactions: take in params and show transactions to admin/byUser page
7) changeApproveStatus(transactionId, newApproveStatus)
--- The functions below generate responses for the report page of SharedBudget and GroupSaving
8) groupReportCategories(groupType, groupId): show categories and % that made up the group's amount
9) groupReportUsers(groupType, groupId): show users and % that made up the group's amount
10) groupReportTransactions(groupType, groupId, filter): show some transactions that match the filter
(Only allow one filter out of the four below)
- filter = latest/earliest: show the last or first transactions made to the group
- filter = highest/lowest: show the transactions with the highest or lowest amount
*/

// loggedInUser: pass in the user object that logged in
// change a Pending transaction's approveStatus to Declined or Approved.
export async function changeApproveStatus(transactionId: string, newApproveStatus: string, loggedInUser) {
    return new Promise(async (resolve, reject) => {  
        await connectMongoDB();
        const dbSession = await startSession();
        dbSession.startTransaction();
        try{           
            const transaction = await Transaction.findById({ _id: transactionId });
            if (!transaction) {
            throw "Transaction not found";
            }
            // Check if the CURRENT approveStatus is Pending - cannot change otherwise
            if(transaction.approveStatus != "Pending"){
                console.log("Invalid status: " + transaction.approveStatus);
                throw "Only Pending transactions can be approved or declined!";
            }
    
            // Handle SharedBudget
            if(transaction.budgetGroupId){
                const sharedBudget = await SharedBudget.findById(transaction.budgetGroupId);
                if (!sharedBudget) {
                    throw 'Shared Budget not found';
                }
                if ((loggedInUser.role != 'Admin') && (loggedInUser._id.toString() !== sharedBudget.hostedBy.toString())) {
                    throw 'Only an Admin or the Host can approve this transaction.';
                }
                if(newApproveStatus === 'Approved'){
                    // change the transaction.approveStatus to "Approved"
                    transaction.approveStatus = "Approved";
                    await transaction.save();
                    // Deduct the amount from SharedBudget
                    await changeBudgetGroupBalance(transaction._id);
                } else if (newApproveStatus === 'Declined'){
                    // Add the amount back to SharedBudget
                    // await revertTransactionSharedBudget(transaction._id, transaction.amount);
                    // change the transaction.approveStatus to "Approved"
                    transaction.approveStatus = "Declined";
                    await transaction.save();
                } else {
                    throw "Invalid approveStatus";
                }                
            }
            else if(transaction.savingGroupId){ // Handle GroupSaving
                console.log(transaction.savingGroupId);
                const groupSaving = await GroupSaving.findById(transaction.savingGroupId);
                if (!groupSaving) {
                    throw 'Group Saving not found';
                }
                if ((loggedInUser.role != 'Admin') && (loggedInUser._id.toString() !== groupSaving.hostedBy.toString())) {
                    throw 'Only an Admin or the Host can approve this transaction.';
                }
                if(newApproveStatus === 'Approved'){
                    transaction.approveStatus = "Approved";
                    await transaction.save();
                    // Add the amount to GroupSaving
                    await changeSavingGroupBalance(transaction._id);
                } else if (newApproveStatus === 'Declined'){
                    transaction.approveStatus = "Declined";
                    await transaction.save();
                } else {
                    throw "Invalid approveStatus";
                }                
            }
            await dbSession.commitTransaction();
            dbSession.endSession();
            resolve(transaction);
            return;
        } catch (error){
            dbSession.abortTransaction();
            dbSession.endSession();
            console.log("Error changing approveStatus: " + error);
            reject(error);
        }
    });
}

export const fetchTransactions = async(searchParams: any, origin: any): Promise<{status: number, response: any}> =>{
    // Origin
    const fromUser = origin['fromUser'];
    const fromAdmin = origin['fromAdmin'];
    const fromGroupSaving = origin['fromGroupSaving'];
    const fromSharedBudget = origin['fromSharedBudget'];

    let groupByUser = ( searchParams['groupByUser'] === 'true' ) ? true : false
    // Match/Filter
    const userId = searchParams['userId']
    const type = searchParams['type']
    const category = searchParams['category']
    const fromDate = searchParams['fromDate']
    const toDate = searchParams['toDate']
    const fromAmount = searchParams['fromAmount']
    const toAmount = searchParams['toAmount']
    const createdDate = searchParams['createdDate'] // 2024 or 2024-06 or 2024-06-13
    // Sort: ascending/descending
    // const sort = searchParams['sort'] || 'descending' // sort: ascending/descending
    const sortDateCreated = searchParams['sortDateCreated']
    const sortDateEdited = searchParams['sortDateEdited']
    const sortUserCreated = searchParams['sortUserCreated']
    const sortAmount = searchParams['sortAmount']

    try {    
        await connectMongoDB();

    // Match and Filter
        let filter = []
        // Handle if called from byUser route
        if(fromUser){
            filter.push({ "userId": new mongoose.Types.ObjectId(fromUser) });
        }

        // Handle situations where transactions from GroupSaving or SharedBudget are called
        if(fromGroupSaving){
            const group = await GroupSaving.findById(fromGroupSaving);
            if (!group) {
                return { response: 'Group Saving not found', status: 404 };
            }
            filter.push({ "savingGroupId": new mongoose.Types.ObjectId(fromGroupSaving)});
        } else if (fromSharedBudget){
            const budget = await SharedBudget.findById(fromSharedBudget);
            if (!budget) {
                return { response: 'Shared Budget not found', status: 404 };
            }
            filter.push({ "budgetGroupId": new mongoose.Types.ObjectId(fromSharedBudget)});
        }

        if (userId) {
            filter.push({ "userId": new mongoose.Types.ObjectId(userId) })
        }

        if (type) {
        filter.push({ "type": type })
        }

        if (category) {
        filter.push({ "category": category })
        }

        if (fromDate || toDate ) {
        let dateFilter : any = {}
        if (fromDate) dateFilter['$gte'] = new Date(fromDate)
        if (toDate) dateFilter['$lte'] = new Date(toDate)
            filter.push({ "createdDate": dateFilter })
        }

        if (fromAmount || toAmount ) {
            let amountFilter : any = {}
            if (fromAmount) amountFilter['$gte'] = Number(fromAmount)
            if (toAmount) amountFilter['$lte'] = Number(toAmount)
            filter.push({ "amount": amountFilter })
        }

        if(createdDate){
            console.log(createdDate);
            const dateParts = createdDate.split('-');
            let dateFilter: any = {};

            if (dateParts.length === 1) { //Only year is provided
                const year = parseInt(dateParts[0]);
                dateFilter['$gte'] = localDate(startOfYear(new Date(year, 0)));
                dateFilter['$lte'] = localDate(endOfYear(new Date(year, 0)));
            } else if (dateParts.length === 2) { //Year and Month are provided
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1;
                dateFilter['$gte'] = localDate(startOfMonth(new Date(year, month)));
                dateFilter['$lte'] = localDate(endOfMonth(new Date(year, month)));
            } else if (dateParts.length === 3) { // Year, month, date are provided
                const date = new Date(createdDate);
                dateFilter['$gte'] = localDate(startOfDay(date));
                dateFilter['$lte'] = localDate(endOfDay(date));
            }
            filter.push({ "createdDate": dateFilter});
        }

        let query = {}
        if (filter.length > 0) query['$and'] = filter

        let groupBy = []
        if (groupByUser) {
        groupBy = [
            { $group :{
                _id: "$user._id",
                userId: { $first: "$user._id"},
                transactions: { $push: "$$ROOT" }
            }
            }
        ]
        }

        let project = [] 
        if (groupByUser) {
        project = [
            { $project: { _id: 0 }} // stop userId from showing up twice
        ]
        }
// Sort
        let sort = {};
        if(sortAmount){
            const order = sortAmount == "ascending" ? 1:-1;
            sort["amount"] = order;
        }
        if(sortDateCreated){
            const order = sortDateCreated == "ascending" ? 1:-1;
            sort["createdDate"] = order;
        }
        if(sortDateEdited){
            const order = sortDateEdited == "ascending" ? 1:-1;
            sort["editedDate"] = order;
        }
        if(sortUserCreated){
            const order = sortUserCreated == "ascending" ? 1:-1;
            sort["user.username"] = order;
            console.log(order);
        }
        if (!sortAmount && !sortDateCreated && !sortDateEdited){
            sort["createdDate"] = -1; // Default option
        }
        // execute pipeline
        let history : any = []
        history = await Transaction.aggregate([
        { $match: query },
        { $lookup: { 
            from: 'users', 
            localField: 'userId', 
            foreignField: '_id',
            pipeline: [
                { $project: {
                    _id: 1,
                    username: 1,
                    fullname: 1,
                    phone: 1,
                    tymeReward: 1
                }
                }
            ], 
            as: 'user' 
            } 
        },
        { $unwind : "$user" },
        { $sort: sort },
        { $project: { userId: 0 }},
        ...groupBy,
        ...project,
        ]);


        let response: any | { [key: string]: any } = {};
        if(groupByUser){
            history.forEach((userGroup: any) => {
                userGroup.transactions.forEach((transaction: any) => {
                    const monthLabel = format(new Date(transaction.createdDate), 'MMM').toUpperCase();
                    if (!response[monthLabel]) {
                        response[monthLabel] = {};
                    }
                    const userId = userGroup.userId;
                    if (!response[monthLabel][userId]) {
                        response[monthLabel][userId] = {
                            userId: userId,
                            transactions: []
                        };
                    }
                    response[monthLabel][userId].transactions.push(transaction);
                });
            });
        }
        else{
            history.forEach((transaction: any) => {
                const monthLabel = format(new Date(transaction.createdDate), 'MMM').toUpperCase();
                if (!response[monthLabel]) {
                    response[monthLabel] = {
                        transactions: []
                    };
                }
                response[monthLabel].transactions.push(transaction);
            });
        }
        // Sort months in descending order
        const sortedMonths = Object.keys(response).sort((a, b) => {
            const monthOrder = {
                JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
                JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
            };
            return monthOrder[b] - monthOrder[a];
        });
        // Construct final response in sorted order
        const sortedResponse = {};
        sortedMonths.forEach(month => {
            sortedResponse[month] = response[month];
        });

        // change this line below to quickly compare output of with and without Month Formatting
        const formatIntoMonth = true;
        if(formatIntoMonth){
            history = response;
        }

        return { response: history , status: 200 }; // use this if no formatting
    } catch (error){
        return { response: error, status: 500};
    }
}



// total expense/income of current month: From the 1st to the current date
// return amount + month
export const currentMonthTotal = async(type: String, currentUserId: string): Promise<{status: number, response: any}> =>{
    try {    
        const currentDate = formatISO(new Date());
        const firstDayOfMonth = localDate(startOfMonth(currentDate));
        const lastDayOfMonth = localDate(endOfMonth(currentDate));
        const currentMonth = format(currentDate, 'MMM').toUpperCase(); // get JUN instead of Jun
        await connectMongoDB();
        const userId = new mongoose.Types.ObjectId(currentUserId);
        // Construct the aggregation pipeline
        const pipeline = [
            {
                $match: {
                    createdDate: {
                        $gte: firstDayOfMonth,
                        $lte: lastDayOfMonth
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
            console.log(`currentMonthTotal: Total amount for type ${type}:`, response.totalAmount);
        } else {
            console.log(`currentMonthTotal: No transactions found for type ${type} in the current month.`);
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
        const currentDate = localDate(new Date()); //string
        // length: number of months to show
        const months = Array.from({ length: 12 }, (_, i) => {
            const monthStart = localDate(startOfMonth(subMonths(currentDate, i)));
            const monthEnd = i === 0 ? currentDate : localDate(endOfMonth(subMonths(currentDate, i)));
            const monthLabel = format(monthStart, 'MMM').toUpperCase();; // Format month for labeling
            return {
                monthLabel,
                monthStart,
                monthEnd
            };
        }).reverse();

        const result = await Promise.all(months.map(async ({ monthLabel, monthStart, monthEnd }) => {
            const [{ totalAmount } = { totalAmount: 0 }] = await Transaction.aggregate([
                {
                    $match: {
                        createdDate: {
                            $gte: monthStart,
                            $lte: monthEnd
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

        // console.log(summary);

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
        const currentDate = localDate(new Date());
        const firstDayOfThisMonth = localDate(startOfMonth(currentDate));
        const firstDayOfLastMonth = localDate(startOfMonth(subMonths(currentDate, 1)));
        const endOfThisMonth = localDate(endOfMonth(currentDate));
        const endOfLastMonth = localDate(endOfMonth(subMonths(currentDate, 1)));
        const pipeline = [
            {
                $facet: {
                    currentMonthIncome: [
                        {
                            $match: {
                                type: 'Income',
                                createdDate: {
                                    $gte: firstDayOfThisMonth,
                                    $lt: endOfThisMonth
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
                                    $lt: endOfThisMonth
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
            response: { "currentIncome": summary.currentMonthIncome, "incomePercentage": incomePercentage.toFixed(2), 
                        "currentExpense": summary.currentMonthExpense, "expensePercentage": expensePercentage.toFixed(2) }
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
        const currentDate = localDate(new Date());
        const firstDayOfMonth = localDate(startOfMonth(currentDate));
        const lastDayOfMonth = localDate((endOfMonth(currentDate)));
        // console.log(firstDayOfMonth, lastDayOfMonth);
        // console.log(formatISO(firstDayOfMonth), formatISO(lastDayOfMonth));
        // First aggregation to get all categories with their total amounts
        const categoriesPipeline: PipelineStage[] = [
            {
                $match: {
                    type: transactionType, 
                    userId: userId,
                    createdDate: {
                        $gte: firstDayOfMonth,
                        $lt: lastDayOfMonth
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
            percentage: totalExpense ? (item.totalAmount / totalExpense * 100).toFixed(2) : '0.00'
        }));

        // Calculate the percentage for the "Other" category
        const top3Percentage = top3Summary.reduce((acc, category) => acc + parseFloat(category.percentage), 0);
        const otherPercentage = (100 - top3Percentage).toFixed(2);

        // If there are no transactions so far, return empty object immediately
        if (top3Percentage == 0){
            return {
                status: 200,
                response: null
            };
        }

        // Calculate the total amount for the "Other" category
        let otherTotal = totalExpense - top3Total;
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

        // console.log(top3Summary);
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
        const currentDate = localDate(new Date());
        const firstDayOfThisMonth = localDate(startOfMonth(currentDate));
        const lastDayOfThisMonth = localDate(endOfMonth(currentDate));
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
                                    $lte: lastDayOfThisMonth
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
                                    $lte: lastDayOfThisMonth
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
