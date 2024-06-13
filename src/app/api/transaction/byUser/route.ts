import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import mongoose from "mongoose";


// Show all transactions from a user. Sort by latest first
// input: user's MongoDB issued ID
export const GET = async( req: NextRequest) => {
    try{
        await connectMongoDB();
        let urlSearchParams = req.nextUrl.searchParams;
        let vnpParams:  { [key: string]: string } = {};
        urlSearchParams.forEach((value, key) => {
            vnpParams[key] = value;
        });
        if(vnpParams.hasOwnProperty("userId")){
            // console.log(vnpParams["userId"]);
            const userObjectId = new mongoose.Types.ObjectId(vnpParams["userId"]);
            // console.log(userObjectId);
            const transaction_agg = Transaction.aggregate();
            transaction_agg.match({ userId: userObjectId});
            transaction_agg.sort({createdDate: -1});
            const transactions = await transaction_agg.exec();
            // const transactions = await Transaction.find().exec();
            // console.log(transactions);
            return NextResponse.json({ response: transactions}, { status: 200});
        }
        else{
            return NextResponse.json({response: 'Missing argument: userId'}, {status: 500});
        }
    } catch (error){
        return NextResponse.json({ response: error.message }, { status: 500 });
    }
}