import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import FinancialChallenge from "src/models/financialChallenge/model";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export const addFinancialChallenge = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - FinancialChallenge.csv';
    // invitations, users, transactions: fetch from these collections
    try {
        let data = await readCSV(filePath);
        data = data.map(financialChallenge => {
            if (financialChallenge._id && mongoose.Types.ObjectId.isValid(financialChallenge._id)) {
                financialChallenge._id = new mongoose.Types.ObjectId(financialChallenge._id);
            }
            if (financialChallenge.savingGroupId && mongoose.Types.ObjectId.isValid(financialChallenge.savingGroupId)) {
                financialChallenge.savingGroupId = new mongoose.Types.ObjectId(financialChallenge.savingGroupId);
            }
            else {
                delete financialChallenge.savingGroupId;  // Remove if it's invalid or empty
            }
            if (financialChallenge.budgetGroupId && mongoose.Types.ObjectId.isValid(financialChallenge.budgetGroupId)) {
                financialChallenge.budgetGroupId = new mongoose.Types.ObjectId(financialChallenge.budgetGroupId);
            }
            else {
                delete financialChallenge.budgetGroupId;  // Remove if it's invalid or empty
            }

            if (financialChallenge.hostedBy && mongoose.Types.ObjectId.isValid(financialChallenge.hostedBy)) {
                financialChallenge.hostedBy = new mongoose.Types.ObjectId(financialChallenge.hostedBy);
            }
            // handle lists
            if (financialChallenge.checkpoints) {
                financialChallenge.checkpoints = financialChallenge.checkpoints.split(';').map(link => {
                    if (mongoose.Types.ObjectId.isValid(link.trim())) {
                        return new mongoose.Types.ObjectId(link.trim());
                    }
                }).filter(checkpoint => checkpoint !== undefined); // Filter out invalid IDs
            }
            if (financialChallenge.members) {
                financialChallenge.members = financialChallenge.members.split(';').map(link => {
                    if (mongoose.Types.ObjectId.isValid(link.trim())) {
                        return new mongoose.Types.ObjectId(link.trim());
                    }
                }).filter(member => member !== undefined); // Filter out invalid IDs
            }
            if (financialChallenge.memberProgress) {
                financialChallenge.memberProgress = financialChallenge.memberProgress.split(';').map(link => {
                    if (mongoose.Types.ObjectId.isValid(link.trim())) {
                        return new mongoose.Types.ObjectId(link.trim());
                    }
                }).filter(memberProgress => memberProgress !== undefined); // Filter out invalid IDs
            }
            return financialChallenge;
        });
        await FinancialChallenge.insertMany(data);
        console.log('financialChallenge inserted successfully');
    } catch (error){
        console.log("financialChallenge read error: " + error)
    }
}

addFinancialChallenge();