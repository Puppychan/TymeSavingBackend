import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";

// IMPORTANT: mongoId here is the transaction's assigned MongoDB ID

/*
    GET: Read one transaction details
    PUT: Update transaction details
    DELETE: Delete transaction
*/
export const GET = async(req: NextRequest, { params }: { params: { mongoId: string } }) => {
    try{
        await connectMongoDB();
        const transaction = await Transaction.findOne({ _id: params.mongoId });
        if (!transaction) {
            return NextResponse.json({ response: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ response: transaction }, { status: 200 });
    }
    catch (error: any) {
        return NextResponse.json({ response: error.message }, { status: 500 });
    }
}
