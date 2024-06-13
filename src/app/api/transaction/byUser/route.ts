import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectMongoDB } from 'src/config/connectMongoDB';
import Transaction from 'src/models/transaction/model';
import { startOfMonth, format, subMonths, endOfMonth } from 'date-fns';

export const GET = async (req: NextRequest) => {
    try {
        await connectMongoDB();
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams: { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });

        if (vnpParams.hasOwnProperty("userId")) {
            const userObjectId = new mongoose.Types.ObjectId(vnpParams["userId"]);
            const currentDate = new Date();

            // Create an array of month details for the past 12 months
            const months = Array.from({ length: 12 }, (_, i) => {
                const monthStart = startOfMonth(subMonths(currentDate, i));
                const monthEnd = i === 0 ? currentDate : endOfMonth(subMonths(currentDate, i));
                const monthLabel = format(monthStart, 'MMM').toUpperCase();
                return {
                    monthLabel,
                    monthStart,
                    monthEnd
                };
            });

            const result = await Promise.all(months.map(async ({ monthLabel, monthStart, monthEnd }) => {
                const transactions = await Transaction.find({
                    createdDate: {
                        $gte: monthStart,
                        $lt: monthEnd
                    },
                    userId: userObjectId
                }).sort({ createdDate: -1 }).exec();

                // Group transactions by day
                const transactionsGroupedByDay = transactions.reduce((acc, transaction) => {
                    const dayLabel = format(new Date(transaction.createdDate), 'yyyy-MM-dd');
                    const dayOfWeek = format(new Date(transaction.createdDate), 'EEE').toUpperCase();

                    if (!acc[dayLabel]) {
                        acc[dayLabel] = {
                            dayOfWeek,
                            transactions: []
                        };
                    }

                    acc[dayLabel].transactions.push(transaction.toObject());
                    return acc;
                }, {});

                return {
                    [monthLabel]: transactionsGroupedByDay
                };
            }));

            const summary = result.reduce((acc, item) => ({ ...acc, ...item }), {});

            console.log(summary);

            return NextResponse.json({ response: summary }, { status: 200 });
        } else {
            return NextResponse.json({ response: 'Missing argument: userId' }, { status: 500 });
        }
    } catch (error) {
        console.error('pastMonthsTotal: Error fetching transactions:', error);
        return NextResponse.json({ response: error.message }, { status: 500 });
    }
}
