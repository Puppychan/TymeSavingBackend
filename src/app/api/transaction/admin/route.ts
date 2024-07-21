export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from 'src/config/connectMongoDB';
import { fetchTransactions } from 'src/lib/fetchTransaction';

export const GET = async (req: NextRequest) => {
    try {
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams: { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });

        await connectMongoDB();
        const origin = {};
        // origin["fromUser"] = userId;
        // origin["fromGroupSaving"] = "b63f324fe62991060d8cc1e7";
        // origin["fromSharedBudget"] = "20316d60de9bf3b2396f5edc";
        // Execute the aggregation pipeline
        const result = await fetchTransactions(vnpParams, origin);
        console.log(result);
        
        return NextResponse.json({ response: result.response }, { status: 200 });
    } catch (error: any) {
        console.log(error);
        return NextResponse.json({ response: 'An error occurred' }, { status: 500 });
    }
}