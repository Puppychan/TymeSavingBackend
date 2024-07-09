import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import GroupSavingParticipation from "src/models/groupSavingParticipation/model";
import mongoose from "mongoose";

export const addSBParticipation = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - GroupSavingParticipation.csv';
    // invitations, users, transactions: fetch from these collections
    try {
        let data = await readCSV(filePath);
        data = data.map(gsp => {
            if (gsp.sharedBudget && mongoose.Types.ObjectId.isValid(gsp.sharedBudget)) {
                gsp.sharedBudget = new mongoose.Types.ObjectId(gsp.sharedBudget);
            }
            if (gsp.user && mongoose.Types.ObjectId.isValid(gsp.user)) {
                gsp.user = new mongoose.Types.ObjectId(gsp.user);
            }
            return gsp;
        });
        await GroupSavingParticipation.insertMany(data);
        console.log('GroupSavingParticipation inserted successfully');
    } catch (error){
        console.log("GroupSavingParticipation read error: " + error)
    }
}

addSBParticipation();