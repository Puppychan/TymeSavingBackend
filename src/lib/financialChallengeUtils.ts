
import { mongo, ObjectId } from "mongoose";
import { connectMongoDB } from "src/config/connectMongoDB";
import FinancialChallenge from "src/models/financialChallenge/model";
import { startSession } from "mongoose";
import User from "src/models/user/model";
import SharedBudget from "src/models/sharedBudget/model";
import GroupSaving from "src/models/groupSaving/model";
import mongoose from "mongoose";
import ChallengeProgress from "src/models/challengeProgress/model";
import Transaction from "src/models/transaction/model";
import { localDate } from "./datetime";

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

// Helper method for create/update transaction. Returns list of challenges.
export async function getChallengesToUpdate(userId, transactionDateString, transactionType): Promise<{status: number, response: any}> {
  try{
    // 2. Get the list of challenges that this user is in (isPublished: true, endDate > now)
    const transactionDate = new Date(transactionDateString);
    const challengeScope = transactionType === 'Expense'? 'BudgetGroup' : 'SavingGroup';
    let challengeList = await FinancialChallenge.find({
      isPublished: true,
      endDate: { $gte: transactionDate },
      members: { $in: [new mongoose.Types.ObjectId(userId)]},
      scope: challengeScope
    })
    if (challengeList.length == 0){
      return { status: 404, response: "No challenges for this transaction to update."};
    }
    return { status: 200, response: challengeList };
  } catch (error){
    console.log(error);
    return { status: 500, response: error };
  }
}

// Update relevant stats when a transaction is created
export async function createTransactionChallenge(transactionId): Promise<{status: number, response: any}>{
  await connectMongoDB();
  const dbSession = await startSession();
  dbSession.startTransaction();
  try {
    // 1. Get the user creating this transaction
    const transaction = await Transaction.findById(transactionId);
    if(!transaction){
      return {status: 404, response: "No such transaction with this id: " + transactionId};
    }
    const user = await User.findById(transaction.userId);
    if(!user){
      return { status: 404, response: "No user associated with this transaction"};
    }
    // 2. Get the list of challenges that this user is in (isPublished: true, endDate > now)    
    let { status, response } = await getChallengesToUpdate(user._id, transaction.createdDate, transaction.type);
    if (status != 200) 
      return {status, response};
    // 3. Update: For each challenge, get challengeProgress (userId, challengeId)
    // currentProgress += amount; call achieveCheckpoint to see if user has passed the checkpoint
    // if yes, give them the points!

  } catch (error){
    dbSession.abortTransaction();
    dbSession.endSession();
    console.log(error);
    return {status: 500, response: error};
  }
}

export async function updateTransactionChallenge(oldAmount: number, transactionId: ObjectId){

}

// This one will be called to see if the user has passed checkpoints in the challenge
export async function achieveCheckpoint(userId, challengeId, newAmount){
  // 1. Get challengeCheckpoint object.
  // 2. Get current progress of the user. 
  // 3. If newAmount > checkpointValue
}