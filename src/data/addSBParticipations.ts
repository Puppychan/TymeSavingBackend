import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model";
import mongoose from "mongoose";

export const addSBParticipation = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - SharedBudgetParticipation.csv';
    // invitations, users, transactions: fetch from these collections
    try {
        let data = await readCSV(filePath);
        data = data.map(sbp => {
            if (sbp.sharedBudget && mongoose.Types.ObjectId.isValid(sbp.sharedBudget)) {
                sbp.sharedBudget = new mongoose.Types.ObjectId(sbp.sharedBudget);
            }
            if (sbp.user && mongoose.Types.ObjectId.isValid(sbp.user)) {
                sbp.user = new mongoose.Types.ObjectId(sbp.user);
            }
            return sbp;
        });
        await SharedBudgetParticipation.insertMany(data);
        console.log('SharedBudgetParticipation inserted successfully');
    } catch (error){
        console.log("SharedBudgetParticipation read error: " + error)
    }
}

addSBParticipation();