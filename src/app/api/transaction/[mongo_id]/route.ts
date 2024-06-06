import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";

// IMPORTANT: mongo_id here is the assigned MongoDB ID

/*
    GET: Read one transaction details
    PUT: Update transaction details
    DELETE: Delete transaction
*/
export const GET = async(req: NextRequest, { params }: { params: { username: string } }) => {
    try{

    }
    catch (error: any) {
        return NextResponse.json({ response: error.message }, { status: 500 });
    }
}
