export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from 'src/config/connectMongoDB';
import { fetchTransactions } from 'src/lib/fetchTransaction';

// let groupByUser = ( searchParams['groupByUser'] === 'true' ) ? true : false
// // Match/Filter
// const userId = searchParams['userId']
// const type = searchParams['type']
// const category = searchParams['category']
// const fromDate = searchParams['fromDate']
// const toDate = searchParams['toDate']
// const fromAmount = searchParams['fromAmount']
// const toAmount = searchParams['toAmount']
// const createdDate = searchParams['createdDate'] // 2024 or 2024-06 or 2024-06-13
// // Sort: ascending/descending
// const sortDateCreated = searchParams['sortDateCreated']
// const sortDateEdited = searchParams['sortDateEdited']
// const sortUserCreated = searchParams['sortUserCreated']
// const sortAmount = searchParams['sortAmount']

export const GET = async (req: NextRequest, { params }: { params: { userId: string } }) => {
    try {
        const userId = params.userId;
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams: { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });

        await connectMongoDB();
        const origin = {};
        origin["fromUser"] = userId;
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