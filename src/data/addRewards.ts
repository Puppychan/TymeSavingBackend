import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import Reward from "src/models/reward/model";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export const addReward = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - Reward.csv';
    // invitations, users, transactions: fetch from these collections
    try {
        let data = await readCSV(filePath);
        data = data.map(reward => {
            if (reward._id && mongoose.Types.ObjectId.isValid(reward._id)) {
                reward._id = new mongoose.Types.ObjectId(reward._id);
            }
            if (reward.createdBy && mongoose.Types.ObjectId.isValid(reward.createdBy)) {
                reward.createdBy = new mongoose.Types.ObjectId(reward.createdBy);
            }
            if (reward.prize){
                // since there is only 1 prize in the data file
                const dataPrize = {
                    category: reward.prize.split(':')[0],
                    value: reward.prize.split(':')[1]
                };
                reward.prize = [dataPrize];
            }
            return reward;
        });
        await Reward.insertMany(data);
        console.log('reward inserted successfully');
    } catch (error){
        console.log("reward read error: " + error)
    }
}

addReward();