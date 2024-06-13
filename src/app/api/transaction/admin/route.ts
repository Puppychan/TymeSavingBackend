import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import mongoose from "mongoose";
// GET: For admins to view all transaction details - may change this route
// Sort transactions: ascending/descending
//     sortDateCreated
//     sortDateUpdated
//     sortUserCreated
//     sortAmount
// Filter transactions: 
// transactions with values in a range
//     filterDateCreatedBefore: date in iso format
//     filterDateCreatedAfter: date in iso format
//     getAmountBelow: number
//     getAmountAbove: number
// transactions with value equals something
//     getTransactionType: Income | Expense
//     getCategory: category name
//     getUserId: userId

export const GET = async (req: NextRequest) => {
    try {
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams:  { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        // console.log(vnpParams);
        try {
            await connectMongoDB();
            let aggregate = Transaction.aggregate();

// Filter fields: filter fields in range or match fields
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
                // console.log(vnpParams["getAmountBelow"]);
                const amount = Number(vnpParams['getAmountBelow']);
                // console.log(amount);
                aggregate.match({ amount: { $lt: amount } });
            }

            // Filter by amount above a certain value
            if (vnpParams.hasOwnProperty('getAmountAbove')) {
                // console.log(vnpParams["getAmountAbove"]);
                const amount = Number(vnpParams['getAmountAbove']);
                // console.log(amount);
                aggregate.match({ amount: { $gte: amount } });
            }

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

            // get username = something
            if (vnpParams.hasOwnProperty('getUserId')) {
                // console.log(vnpParams["getUserId"]);
                const queryUserId = new mongoose.Types.ObjectId(vnpParams['getUserId']);
                aggregate.match({ userId: queryUserId });
            }

// Sort fields: dateCreated, dateUpdated, userId, amount
            // Sort by date created
            if (vnpParams.hasOwnProperty('sortDateCreated')) {
                const sortOrder = vnpParams['sortDateCreated'] === 'ascending' ? 1 : -1;
                aggregate.sort({ createdDate: sortOrder });
            }

            // Sort by date updated
            if (vnpParams.hasOwnProperty('sortDateUpdated')) {
                const sortOrder = vnpParams['sortDateUpdated'] === 'ascending' ? 1 : -1;
                aggregate.sort({ editedDate: sortOrder });
            }

            // Sort by user who created the transaction
            if (vnpParams.hasOwnProperty('sortUserCreated')) {
                const sortOrder = vnpParams['sortUserCreated'] === 'ascending' ? 1 : -1;
                aggregate.sort({ userId: sortOrder });
            }

            // Sort by amount
            if (vnpParams.hasOwnProperty('sortAmount')) {
                const sortOrder = vnpParams['sortAmount'] === 'ascending' ? 1 : -1;
                aggregate.sort({ amount: sortOrder });
            }

            // Execute the aggregation pipeline
            let result = await aggregate.exec();

            return NextResponse.json({ response: result }, { status: 200 });
        } catch (error: any) {
            return NextResponse.json({ response: error.message}, { status: 500 });
        }
    } catch (error){
        console.log(error);
    }
}