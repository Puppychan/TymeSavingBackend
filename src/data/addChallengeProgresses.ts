import { readCSV } from "src/lib/readCSV";
import { connectMongoDB, disconnectDB } from "src/config/connectMongoDB";
import ChallengeProgress from "src/models/challengeProgress/model";
import { CheckpointPass } from "src/models/challengeProgress/model";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export const addChallengeProgress = async () => {
    await connectMongoDB();
    const filePath = 'data/NI Data - ChallengeProgress.csv';
    // invitations, users, transactions: fetch from these collections
    try {
        let data = await readCSV(filePath);
        data = data.map(challengeProgress => {
            if (challengeProgress._id && mongoose.Types.ObjectId.isValid(challengeProgress._id)) {
                challengeProgress._id = new mongoose.Types.ObjectId(challengeProgress._id);
            }
            if (challengeProgress.userId && mongoose.Types.ObjectId.isValid(challengeProgress.userId)) {
                challengeProgress.userId = new mongoose.Types.ObjectId(challengeProgress.userId);
            }
            if (challengeProgress.challengeId && mongoose.Types.ObjectId.isValid(challengeProgress.challengeId)) {
                challengeProgress.challengeId = new mongoose.Types.ObjectId(challengeProgress.challengeId);
            }
            if (challengeProgress.checkpointPassed) {
                challengeProgress.checkpointPassed = challengeProgress.checkpointPassed.split(';').map(link => {
                    if (mongoose.Types.ObjectId.isValid(link.trim())) {
                        return new CheckpointPass({
                            checkpointId: new mongoose.Types.ObjectId(link.trim()),
                            date: challengeProgress.lastUpdate
                        });
                    }
                }).filter(checkpoint => checkpoint !== undefined); // Filter out invalid IDs
                console.log(challengeProgress.checkpointPassed);
            }
            else {
                delete challengeProgress.checkpointPassed;
            }
            return challengeProgress;
        });
        await ChallengeProgress.insertMany(data);
        console.log('challengeProgress inserted successfully');
    } catch (error){
        console.log("challengeProgress read error: " + error)
    }
}

addChallengeProgress();