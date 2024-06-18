import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { ITransaction } from "src/models/transaction/interface";
import Transaction from "src/models/transaction/model";

// IMPORTANT: transactionId here is the transaction's assigned MongoDB ID

/*
    GET: Read one transaction details
    PUT: Update transaction details
    DELETE: Delete transaction
*/

// READ the transaction details
export const GET = async(req: NextRequest, { params }: { params: { transactionId: string } }) => {
    try{
        await connectMongoDB();
        const transaction = await Transaction.findById({ _id: params.transactionId });
        if (!transaction) {
            return NextResponse.json({ response: "Transaction not found" }, { status: 404 });
        }

        return NextResponse.json({ response: transaction }, { status: 200 });
    }
    catch (error: any) {
        return NextResponse.json({ response: error.message }, { status: 500 });
    }
}

// UPDATE transaction details
export const PUT = async(req: NextRequest, { params }: { params: {transactionId: string} }) => {
    try {
        await connectMongoDB();
  
        const payload = await req.json() as Partial<ITransaction> //payload = newUser
        const transaction = await Transaction.findOne({ _id: params.transactionId });
        if (!transaction) {
          return NextResponse.json({ response: 'Transaction not found' }, { status: 404 });
        }
  
        const updateQuery: any = {};
        Object.keys(payload).forEach(key => {
            updateQuery[`${key}`] = payload[key as keyof ITransaction];
        });
  
        const updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: params.transactionId },
            { 
                $set: updateQuery,
                editedDate: Date.now()
            },
            {
                new: true,
                runValidators: true,
            }
        );
        console.log('updatedTransaction:', updatedTransaction);
        console.log('updated fields: ', updateQuery);
        return NextResponse.json({ response: updatedTransaction }, { status: 200 });
    } catch (error: any) {
        console.log('Error updating user:', error);
        return NextResponse.json({ response: 'Cannot update transaction with id ' + params.transactionId }, { status: 500 });
    }
}

// DELETE transaction
export const DELETE = async(req: NextRequest, { params }: { params: { transactionId: string } }) => {
    const transactionId = params.transactionId;
    try {
        await connectMongoDB();

        const query_transaction = await Transaction.findOne({ _id: transactionId });
        if (query_transaction) {
            await Transaction.deleteOne({ _id: transactionId });
            return NextResponse.json(
                { response: "Transaction deleted successfully." },
                { status: 200 }
            );
        } else {
            return NextResponse.json({ response: "No such transaction." }, { status: 400 });
        }
    } catch (error) {
        console.log(error);
        return NextResponse.json(
        { response: "Transaction with id " + transactionId + " could not be deleted." },
        { status: 500 }
        );
    }
}