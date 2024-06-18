import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectMongoDB } from 'src/config/connectMongoDB';
import Transaction from 'src/models/transaction/model';
import User from 'src/models/user/model';
import { startOfMonth, format, subMonths, endOfMonth, startOfDay, endOfDay } from 'date-fns';

// GET: For the user to view all their transaction details
// Filter transactions: 
// transactions with value equals something
//     getTransactionType: Income | Expense
//     getCategory: category name
//     getDateCreated
// transactions with values in a range
//     filterDateCreatedBefore: date in iso format
//     filterDateCreatedAfter: date in iso format
//     getAmountBelow: number
//     getAmountAbove: number
// Sort transactions: ascending/descending
//     sortDateCreated
//     sortDateUpdated
//     sortAmount

export const GET = async (req: NextRequest, { params }: { params: { username: string } }) => {
    try {
        const username = params.username;
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams: { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        
        try {
            await connectMongoDB();
            // from the username, fetch the user's id
            // Lookup userId from username
            const user = await User.findOne({ username: username }).exec();
            if (!user) {
                return NextResponse.json({ response: 'User not found' }, { status: 404 });
            }
            const userId = user._id;

            let aggregate = Transaction.aggregate();
            // get matching userId
            const queryUserId = new mongoose.Types.ObjectId(userId);
            aggregate.match({ userId: queryUserId });
// Filter: match properties = value
            // Filter by transaction type
            if (vnpParams.hasOwnProperty('getTransactionType')) {
                const transactionType = vnpParams['getTransactionType'];
                aggregate.match({ type: transactionType });
            }

            // Filter by category
            if (vnpParams.hasOwnProperty('getCategory')) {
                const category = vnpParams['getCategory'];
                aggregate.match({ category: category });
            }

            // get all transactions within a date
            if (vnpParams.hasOwnProperty('getDateCreated')) {
                const dateCreated = new Date(vnpParams['getDateCreated']);
                const startDate = new Date(dateCreated.setUTCHours(0));
                const endDate = new Date(endOfDay(dateCreated).setUTCHours(23));
                aggregate.match(
                    { createdDate: 
                        {
                            $gte: startDate,
                            $lt: endDate
                        }
                    });
            }

// Filter fields: filter fields in range
            // Filter by createdDate before a certain date
            if (vnpParams.hasOwnProperty('filterDateCreatedBefore')) {
                const date = new Date(vnpParams['filterDateCreatedBefore']);
                aggregate.match({ createdDate: { $lt: date } });
            }

            // Filter by createdDate after a certain date
            if (vnpParams.hasOwnProperty('filterDateCreatedAfter')) {
                const date = new Date(vnpParams['filterDateCreatedAfter']);
                aggregate.match({ createdDate: { $gte: date } });
            }

            // Filter by amount below a certain value
            if (vnpParams.hasOwnProperty('getAmountBelow')) {
                const amount = Number(vnpParams['getAmountBelow']);
                aggregate.match({ amount: { $lt: amount } });
            }

            // Filter by amount above a certain value
            if (vnpParams.hasOwnProperty('getAmountAbove')) {
                const amount = Number(vnpParams['getAmountAbove']);
                aggregate.match({ amount: { $gte: amount } });
            }
// sort
            let sortField: string = "createdDate";
            let sortOrder: -1 | 1;

            if (vnpParams.hasOwnProperty('sortDateUpdated')) {
                sortField = "updatedDate";
                sortOrder = vnpParams['sortDateUpdated'] === 'ascending' ? 1 : -1;
            }

            if (vnpParams.hasOwnProperty('sortDateCreated')) {
                sortOrder = vnpParams['sortDateCreated'] === 'ascending' ? 1 : -1;
            }

            if (vnpParams.hasOwnProperty('sortAmount')) {
                sortOrder = vnpParams['sortAmount'] === 'ascending' ? 1 : -1;
                sortField = "amount";
            }

// Execute the aggregation pipeline
            let result = await aggregate.exec();
            console.log(result);
// Format the response
            let response: { [key: string]: any } = {};

            result.forEach((transaction: any) => {
                const monthLabel = format(new Date(transaction.createdDate), 'MMM').toUpperCase();
                if (!response[monthLabel]) {
                    response[monthLabel] = {
                        transactions: []
                    };
                }
                response[monthLabel].transactions.push({
                    // Customize the fields, add more if needed
                    _id: transaction._id,
                    username: username,
                    type: transaction.type,
                    category: transaction.category,
                    amount: transaction.amount,
                    createdDate: transaction.createdDate,
                    updatedDate: transaction.updatedDate
                });
            });
// sorting the responses
            Object.keys(response).forEach(monthLabel => {
                response[monthLabel].transactions.sort((a: any, b: any) => {
                    var aValue: number, bValue: number;
                    if(sortField == "createdDate"){
                        aValue = new Date(a.createdDate).getTime();
                        bValue = new Date(b.createdDate).getTime();
                    }
                    else if (sortField == "updatedDate"){
                        aValue = new Date(a.updatedDate).getTime();
                        bValue = new Date(b.updatedDate).getTime();
                    }
                    else if (sortField == "amount"){
                        aValue = a.amount;
                        bValue = b.amount;
                    }
                    return sortOrder == 1? (aValue - bValue) : (bValue - aValue);
                });
            });

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
            
            return NextResponse.json({ response: sortedResponse }, { status: 200 });
        } catch (error: any) {
            return NextResponse.json({ response: error.message }, { status: 500 });
        }
    } catch (error) {
        console.log(error);
        return NextResponse.json({ response: 'An error occurred' }, { status: 500 });
    }
}
