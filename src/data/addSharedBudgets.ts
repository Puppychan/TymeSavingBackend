import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import SharedBudget from "src/models/sharedBudget/model";
import mongoose from "mongoose";

export const addSharedBudget = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - SharedBudget.csv';
    // invitations, users, transactions: fetch from these collections
    try {
        let data = await readCSV(filePath);
        data = data.map(sharedBudget => {
            if (sharedBudget._id && mongoose.Types.ObjectId.isValid(sharedBudget._id)) {
                sharedBudget._id = new mongoose.Types.ObjectId(sharedBudget._id);
            }
            if (sharedBudget.hostedBy && mongoose.Types.ObjectId.isValid(sharedBudget.hostedBy)) {
                sharedBudget.hostedBy = new mongoose.Types.ObjectId(sharedBudget.hostedBy);
            }
            return sharedBudget;
        });
        await SharedBudget.insertMany(data);
        console.log('SharedBudget inserted successfully');
    } catch (error){
        console.log("SharedBudget read error: " + error)
    }
}

addSharedBudget();