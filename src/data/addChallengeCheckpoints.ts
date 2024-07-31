import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export const addChallengeCheckpoint = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - ChallengeCheckpoint.csv';
    // invitations, users, transactions: fetch from these collections
    try {
        let data = await readCSV(filePath);
        data = data.map(challengeCheckpoint => {
            if (challengeCheckpoint._id && mongoose.Types.ObjectId.isValid(challengeCheckpoint._id)) {
                challengeCheckpoint._id = new mongoose.Types.ObjectId(challengeCheckpoint._id);
            }
            if (challengeCheckpoint.challengeId && mongoose.Types.ObjectId.isValid(challengeCheckpoint.challengeId)) {
                challengeCheckpoint.challengeId = new mongoose.Types.ObjectId(challengeCheckpoint.challengeId);
            }
            if (challengeCheckpoint.reward && mongoose.Types.ObjectId.isValid(challengeCheckpoint.reward)) {
                challengeCheckpoint.reward = new mongoose.Types.ObjectId(challengeCheckpoint.reward);
            }
            if (challengeCheckpoint.createdBy && mongoose.Types.ObjectId.isValid(challengeCheckpoint.createdBy)) {
                challengeCheckpoint.createdBy = new mongoose.Types.ObjectId(challengeCheckpoint.createdBy);
            }
            return challengeCheckpoint;
        });
        await ChallengeCheckpoint.insertMany(data);
        console.log('challengeCheckpoint inserted successfully');
    } catch (error){
        console.log("challengeCheckpoint read error: " + error)
    }
}

addChallengeCheckpoint();