import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import { ITransaction } from "src/models/transaction/interface";
import Transaction from "src/models/transaction/model";
import { startSession } from "mongoose";
import { localDate } from "src/lib/datetime";
import { revertTransactionSharedBudget, updateTransactionSharedBudget } from "src/lib/sharedBudgetUtils";
import { updateTransactionGroupSaving, revertTransactionGroupSaving } from "src/lib/groupSavingUtils";
import { updateTransactionChallenge } from "src/lib/financialChallengeUtils";
import { uploadFile } from "src/lib/firebase/storage";

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
    await connectMongoDB();
    const dbSession = await startSession();
    dbSession.startTransaction();
    try {
        // const payload = await req.json() as Partial<ITransaction> //payload = newUser
        const formData = await req.formData(); // Assuming you're receiving formData in the PUT request
        
        const transactionImages = formData.getAll("image") as File[];
        let userId = formData.get("userId");
        let description = formData.get("description");
        let type = formData.get("type");
        let amount: any = formData.get("amount");
        let payBy = formData.get("payBy");
        let category = formData.get("category");
        let savingGroupId = formData.get("savingGroupId");
        let budgetGroupId = formData.get("budgetGroupId");
        let approveStatus = formData.get("approveStatus");
        let createdDate = formData.get("createdDate");
        let editedDate = formData.get("editedDate");
        let isMomo = formData.get("isMomo");
        let isUpdateImage = formData.get("isUpdateImage");

        const transaction = await Transaction.findOne({ _id: params.transactionId });
        if (!transaction) {
          return NextResponse.json({ response: 'Transaction not found' }, { status: 404 });
        }
        const oldAmount = transaction.amount; // get the amount before update

        const updateQuery: any = {};
        // Object.keys(payload).forEach(key => {
        //     updateQuery[`${key}`] = payload[key as keyof ITransaction];
        // });
        // const updateFields: any = {};
        if (userId) updateQuery.userId = userId;
        if (description) updateQuery.description = description;
        if (type) updateQuery.type = type;
        if (amount) updateQuery.amount = amount;
        if (payBy) updateQuery.payBy = payBy;
        if (category) updateQuery.category = category;
        if (savingGroupId) updateQuery.savingGroupId = savingGroupId;
        if (budgetGroupId) updateQuery.budgetGroupId = budgetGroupId;
        if (approveStatus) updateQuery.approveStatus = approveStatus;
        if (createdDate) updateQuery.createdDate = createdDate;
        if (editedDate) updateQuery.editedDate = editedDate;
        if (isMomo) updateQuery.isMomo = isMomo;

        // If the type changes while this transaction belongs to a Shared Budget or a Group Saving
        if((transaction.budgetGroupId || updateQuery.budgetGroupId) && updateQuery.type && updateQuery.type === 'Income'){
            return NextResponse.json(
                { response: 'Transaction is in Shared Budget, cannot change to Income!' }, 
                { status: 400 }
            );
        }
        if((transaction.savingGroupId || updateQuery.savingGroupId) && updateQuery.type && updateQuery.type === 'Expense'){
            return NextResponse.json(
                { response: 'Transaction is in Group Saving, cannot change to Expense!' }, 
                { status: 400 }
            );
        }

        let imageUrls = []
        // check if not null
        if (transactionImages.length > 0) {
            for (let i = 0; i < transactionImages.length; i++) {
                let filename = transactionImages[i].name.split(' ').join('_')
                const fileRef = `${Date.now()}_${filename}`;
                let imageUrl = await uploadFile(transactionImages[i], fileRef)
                imageUrls.push(imageUrl)
            }
            updateQuery.transactionImages = imageUrls;
        } else if (isUpdateImage && isUpdateImage === 'true') {
            updateQuery.transactionImages = imageUrls;
        } 

        const updatedTransaction = await Transaction.findOneAndUpdate(
            { _id: params.transactionId },
            { 
                $set: updateQuery,
                editedDate: localDate(new Date())
            },
            {
                new: true,
                runValidators: true,
            }
        );
        // Amount changes -> Update groups
        if (oldAmount != updatedTransaction.amount){
            if (updatedTransaction.budgetGroupId){
                await updateTransactionSharedBudget(params.transactionId, oldAmount);
            }
            else if (updatedTransaction.savingGroupId){
                await updateTransactionGroupSaving(params.transactionId, oldAmount);
            }
            await updateTransactionChallenge(updatedTransaction._id, oldAmount);
        }
        
        await dbSession.commitTransaction();  // Commit the transaction
        await dbSession.endSession();  // End the session
        return NextResponse.json({ response: updatedTransaction }, { status: 200 });
    } catch (error: any) {
        await dbSession.abortTransaction();  // Commit the transaction
        await dbSession.endSession();  // End the session
        console.log('Error updating user:', error);
        return NextResponse.json({ response: 'Cannot update transaction with id ' + params.transactionId }, { status: 500 });
    }
}

// DELETE transaction
export const DELETE = async(req: NextRequest, { params }: { params: { transactionId: string } }) => {
    const transactionId = params.transactionId;
    await connectMongoDB();
    const dbSession = await startSession();
    dbSession.startTransaction();
    try {
        const query_transaction = await Transaction.findOne({ _id: transactionId });
        if (query_transaction) {
            // Add the amount back to the budget group
            if (query_transaction.budgetGroupId){
                await revertTransactionSharedBudget(params.transactionId, query_transaction.amount);
            }          
            // Deduct the amount from the saving group
            else if (query_transaction.savingGroupId){
                await revertTransactionGroupSaving(params.transactionId, query_transaction.amount);
            }
            await updateTransactionChallenge(query_transaction._id);

            // Delete the transaction
            await Transaction.deleteOne({ _id: transactionId });

            await dbSession.commitTransaction();  // Commit the transaction
            await dbSession.endSession();  // End the session
            return NextResponse.json(
                { response: "Transaction deleted successfully." },
                { status: 200 }
            );
        } else {
            return NextResponse.json({ response: "No such transaction." }, { status: 404 });
        }
    } catch (error) {
        console.log(error);
        await dbSession.abortTransaction();  // Abort the transaction
        await dbSession.endSession();  // End the session
        return NextResponse.json(
        { response: "Transaction with id " + transactionId + " could not be deleted." },
        { status: 500 }
        );
    }
}