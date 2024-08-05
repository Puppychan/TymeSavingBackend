
import { mongo, ObjectId } from "mongoose";
import { connectMongoDB } from "src/config/connectMongoDB";
import FinancialChallenge from "src/models/financialChallenge/model";
import { startSession } from "mongoose";
import User from "src/models/user/model";
import SharedBudget from "src/models/sharedBudget/model";
import GroupSaving from "src/models/groupSaving/model";
import mongoose from "mongoose";
import ChallengeProgress from "src/models/challengeProgress/model";

export async function verifyMember(userId: ObjectId, challengeId: string) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      let isMember = await FinancialChallenge.find({ _id: challengeId, members: {$in : [userId]} })
      if (isMember) {
        return resolve(true)
      }
      resolve(false)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

// Whenever a user joins a group, this user will automatically join all challenges in this group.
// Whenever joinGroupSaving or joinSharedBudget is called, this will be called
// groupType: SharedBudget or GroupSaving
export async function userJoinGroupChallenge (userId: mongoose.Types.ObjectId, groupId: mongoose.Types.ObjectId, groupType: string) {
  //1. Get list of challenges in this group. Get only challenges that have not ended.
  //2. Create a challengeProgress object for this member and userId.
  //3. For each challenge: add this userId to "members"; add the new challengeProgress to "memberProgress"
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();
  try{
    // Check if user and group exist. If yes, get the group's challenges list
    const checkUser = await User.findById(userId);
    let challengeList;

    if(!checkUser) return {status: 404, response: "User not found"};
    if(groupType === 'SharedBudget'){
      const checkSB = await SharedBudget.findById(groupId);
      if(!checkSB) return {status: 404, response: "SharedBudget not found"};
      challengeList = await FinancialChallenge.find({budgetGroupId: new mongoose.Types.ObjectId(groupId)});
    } else if (groupType === 'GroupSaving'){
      const checkGS = await GroupSaving.findById(groupId);
      if(!checkGS) return {status: 404, response: "GroupSaving not found"};
      challengeList = await FinancialChallenge.find({budgetGroupId: new mongoose.Types.ObjectId(groupId)});
    } else return {status: 500, response: "Invalid group type"};
    // For each element in challenge list, create a challengeProgress object.
    let progressList = [];

    for (let challenge of challengeList) {
      const challengeId = challenge._id;

      // Create a new ChallengeProgress object
      const newProgress = new ChallengeProgress({
        userId: userId,
        challengeId: challengeId,
      });

      // Add this userId to the members array in FinancialChallenge
      challenge.members.push(userId);

      // Add the new progress object to the memberProgress array
      challenge.memberProgress.push(newProgress._id);

      // Save the changes to the challenge
      await challenge.save();

      // Add the new progress to the list to be inserted into ChallengeProgress collection
      progressList.push(newProgress);
    }
    await ChallengeProgress.insertMany(progressList);
    // Get the updated challenges with the new member and progress
    const returnedChallenges = await FinancialChallenge.find({budgetGroupId: new mongoose.Types.ObjectId(groupId)});
    dbSession.commitTransaction();
    dbSession.endSession();
    return {status: 200, response: {returnedChal: returnedChallenges}};
  } catch (error) {
    console.log(error);
    dbSession.abortTransaction();
    dbSession.endSession();
    return {status: 500, response: error};
  }
}