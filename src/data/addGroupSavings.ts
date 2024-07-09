import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import GroupSaving from "src/models/groupSaving/model";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export const addGroupSaving = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - GroupSaving.csv';
    // invitations, users, transactions: fetch from these collections
    try {
        let data = await readCSV(filePath);
        data = data.map(groupSaving => {
            if (groupSaving._id && mongoose.Types.ObjectId.isValid(groupSaving._id)) {
                groupSaving._id = new mongoose.Types.ObjectId(groupSaving._id);
            }
            if (groupSaving.hostedBy && mongoose.Types.ObjectId.isValid(groupSaving.hostedBy)) {
                groupSaving.hostedBy = new mongoose.Types.ObjectId(groupSaving.hostedBy);
            }
            return groupSaving;
        });
        await GroupSaving.insertMany(data);
        console.log('GroupSaving inserted successfully');
    } catch (error){
        console.log("GroupSaving read error: " + error)
    }
}

addGroupSaving();