import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "src/config/connectMongoDB";
import Transaction from "src/models/transaction/model";
import {TransactionType} from "src/models/transaction/interface"
import { localDate } from 'src/lib/datetime';
import { changeSavingGroupBalance, checkGroupSavingClosed } from "src/lib/groupSavingUtils";
import { changeBudgetGroupBalance, checkSharedBudgetClosed } from "src/lib/sharedBudgetUtils";
import { updateUserPoints } from "src/lib/userUtils";
import { startSession } from "mongoose";
import GroupSaving from "src/models/groupSaving/model";
import SharedBudget from "src/models/sharedBudget/model";
import { createTransactionChallenge } from "src/lib/financialChallengeUtils";
import { verifyAuth } from "src/lib/authentication";
import { uploadFile } from "src/lib/firebase/storage";
/*
    POST: Create a transaction
*/

export const POST = async (req:NextRequest) => {
    await connectMongoDB();
    const dbSession = await startSession();
    dbSession.startTransaction();
  
    try{
        // const verification = await verifyAuth(req.headers)
        // if (verification.status !== 200) {
        //   return NextResponse.json({ response: verification.response }, { status: verification.status });
        // }    
        // const user = verification.response;

        const formData = await req.formData();
        const transactionImages = formData.getAll("image") as File[];
        let userId = formData.get("userId");
        let description = formData.get("description");
        let type = formData.get("type");
        let amount : any = formData.get("amount");
        let payBy = formData.get("payBy");
        let category = formData.get("category");
        let savingGroupId = formData.get("savingGroupId");
        let budgetGroupId = formData.get("budgetGroupId");
        let approveStatus = formData.get("approveStatus");
        let createdDate = formData.get("createdDate");
        let editedDate = formData.get("editedDate");
        console.log("Creating a transaction - form data: ", formData);

        if (!amount || amount === '' || isNaN(Number(amount))) {
            return NextResponse.json({response: "Amount must be a valid number", status: 400});
        }
        amount = Number(amount);
        if (amount <= 0) {
            return NextResponse.json({response: "Amount must be greater than 0", status: 400});
        }

        // Check group ID; Fetch the group's default approve status ("Approved" vs "Declined")
        if(savingGroupId){
            console.log("Creating a transaction to " + savingGroupId);
            const savingGroup = await GroupSaving.findById(savingGroupId);
            if(!savingGroup){
                return NextResponse.json({response: "No such Group Saving", status: 404});
            }
            // Check if the group has been closed or expired
            await checkGroupSavingClosed(savingGroupId);
            approveStatus = savingGroup.defaultApproveStatus;
        }

        if(budgetGroupId){
            console.log("Creating a transaction to " + budgetGroupId);
            const budgetGroup = await SharedBudget.findById(budgetGroupId);
            if(!budgetGroup){
                return NextResponse.json({response: "No such Shared Budget", status: 404});
            }
            await checkSharedBudgetClosed(budgetGroupId);
            approveStatus = budgetGroup.defaultApproveStatus;
        }

        let imageUrls = []
        if (transactionImages) {
            for (let i = 0; i < transactionImages.length; i++) {
                let filename = transactionImages[i].name.split(' ').join('_')
                const fileRef = `${Date.now()}_${filename}`;
                let imageUrl = await uploadFile(transactionImages[i], fileRef)
                imageUrls.push(imageUrl)
            }
        }

        const newTransaction = new Transaction({
            userId: userId,
            description: description,
            type: type === 'Income' ? TransactionType.Income : TransactionType.Expense,
            amount: amount,
            transactionImages: imageUrls,
            payBy: payBy,
            category: category,
            savingGroupId: savingGroupId,
            budgetGroupId: budgetGroupId,
            approveStatus: approveStatus,
            createdDate: createdDate ? localDate(new Date(createdDate as string)) : localDate(new Date()),
            editedDate: editedDate ? localDate(new Date(editedDate as string)) : localDate(new Date()),
        });
        await newTransaction.save();
        // Update SharedBudget, GroupSaving, and corresponding challenges

        // Change the group balance
        // Only if the transaction is associated with a group
        // And the group auto-approve transactions
        if (savingGroupId && approveStatus === 'Approved'){
            await changeSavingGroupBalance(newTransaction._id);
        }
        if (budgetGroupId && approveStatus === 'Approved') {
            await changeBudgetGroupBalance(newTransaction._id);
        }
        await createTransactionChallenge(newTransaction._id); // attempt to update challenge progress
        await dbSession.commitTransaction();  // Commit the transaction
        await dbSession.endSession();  // End the session
        
        return NextResponse.json({response: newTransaction}, {status: 200});
    }
    catch (error: any) {
        console.log('Error creating transaction:', error);
        await dbSession.abortTransaction();  // Abort the transaction
        await dbSession.endSession();  // End the session

        return NextResponse.json({ response: 'Failed to create transaction: ' + error}, { status: 500 });
    }
}
