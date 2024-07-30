export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectMongoDB } from 'src/config/connectMongoDB';
import Transaction from 'src/models/transaction/model';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { match } from 'assert';

export const GET = async (req: NextRequest) => {
    try {
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams: { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });

        await connectMongoDB();
        const aggregatePipeline: any[] = [];

        // Combine all match conditions into a single match stage
        const matchConditions: any = {};

        if (vnpParams.getUserId){
            matchConditions.userId = new mongoose.Types.ObjectId(vnpParams.getUserId);
        }

        if (vnpParams.getTransactionType) {
            matchConditions.type = vnpParams.getTransactionType;
        }

        if (vnpParams.getCategory) {
            matchConditions.category = vnpParams.getCategory;
        }

        if (vnpParams.getDateCreated) {
            const getDate = vnpParams.getDateCreated;
            const dateParts = getDate.split('-');
            let startDate: Date, endDate: Date;

            if (dateParts.length === 1) {
                const year = parseInt(dateParts[0]);
                startDate = startOfYear(new Date(year, 0));
                endDate = endOfYear(new Date(year, 0));
            } else if (dateParts.length === 2) {
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1;
                startDate = startOfMonth(new Date(year, month));
                endDate = endOfMonth(new Date(year, month));
            } else if (dateParts.length === 3) {
                const date = new Date(getDate);
                startDate = startOfDay(date);
                endDate = endOfDay(date);
            }

            matchConditions.createdDate = { $gte: startDate, $lte: endDate };
        }

        if (vnpParams.filterDateCreatedBefore) {
            const date = new Date(vnpParams.filterDateCreatedBefore);
            matchConditions.createdDate = { ...matchConditions.createdDate, $lt: date };
        }

        if (vnpParams.filterDateCreatedAfter) {
            const date = new Date(vnpParams.filterDateCreatedAfter);
            matchConditions.createdDate = { ...matchConditions.createdDate, $gte: date };
        }

        if (vnpParams.getAmountBelow) {
            const amount = Number(vnpParams.getAmountBelow);
            matchConditions.amount = { ...matchConditions.amount, $lt: amount };
        }

        if (vnpParams.getAmountAbove) {
            const amount = Number(vnpParams.getAmountAbove);
            matchConditions.amount = { ...matchConditions.amount, $gt: amount };
        }

        // Add the combined match stage
        if (Object.keys(matchConditions).length > 0) {
            aggregatePipeline.push({ $match: matchConditions });
        }

        // Sort logic
        let sortField = 'createdDate';
        let sortOrder: -1 | 1 = -1;

        if (vnpParams.sortDateUpdated) {
            sortField = 'updatedDate';
            sortOrder = vnpParams.sortDateUpdated === 'ascending' ? 1 : -1;
        } else if (vnpParams.sortDateCreated) {
            sortOrder = vnpParams.sortDateCreated === 'ascending' ? 1 : -1;
        } else if (vnpParams.sortAmount) {
            sortField = 'amount';
            sortOrder = vnpParams.sortAmount === 'ascending' ? 1 : -1;
        }

        const typeSortConditions = [
            'IncomeAmountAscending',
            'IncomeAmountDescending',
            'IncomeDateAscending',
            'IncomeDateDescending',
            'ExpenseAmountAscending',
            'ExpenseAmountDescending',
            'ExpenseDateAscending',
            'ExpenseDateDescending'
        ];

        for (const condition of typeSortConditions) {
            if (vnpParams.hasOwnProperty(condition)) {
                const [type, field, order] = condition.match(/(Income|Expense)(Amount|Date)(Ascending|Descending)/).slice(1, 4);
                aggregatePipeline.push({ $match: { type } });
                sortField = field.toLowerCase() === 'amount' ? 'amount' : 'createdDate';
                sortOrder = order === 'Ascending' ? 1 : -1;
            }
        }

        // Add the sort stage
        aggregatePipeline.push({ $sort: { [sortField]: sortOrder } });

        // Execute the aggregation pipeline
        const result = await Transaction.aggregate(aggregatePipeline).exec();
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
                _id: transaction._id,
                userId: transaction.userId,
                type: transaction.type,
                category: transaction.category,
                amount: transaction.amount,
                createdDate: transaction.createdDate,
                updatedDate: transaction.updatedDate
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
        console.log(error);
        return NextResponse.json({ response: 'An error occurred' }, { status: 500 });
    }
}