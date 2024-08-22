
import { mongo, ObjectId } from "mongoose";
import { connectMongoDB } from "src/config/connectMongoDB";
import mongoose from "mongoose";
import { startSession } from "mongoose";
// Models
import FinancialChallenge from "src/models/financialChallenge/model";
import User from "src/models/user/model";
import SharedBudget from "src/models/sharedBudget/model";
import GroupSaving from "src/models/groupSaving/model";
import ChallengeProgress from "src/models/challengeProgress/model";
import Transaction from "src/models/transaction/model";
import ChallengeCheckpoint from "src/models/challengeCheckpoint/model";
import Reward from "src/models/reward/model";
// Functions
import { localDate } from "./datetime";
import { updateUserPoints } from "./userUtils";

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
    const dateFilter = {endDate: {$gt: localDate(new Date())}};

    if(!checkUser) return {status: 404, response: "User not found"};
    if(groupType === 'SharedBudget'){
      const checkSB = await SharedBudget.findById(groupId);
      if(!checkSB) return {status: 404, response: "SharedBudget not found"};
      challengeList = await FinancialChallenge.find({budgetGroupId: new mongoose.Types.ObjectId(groupId)}).find(dateFilter);
    } else if (groupType === 'GroupSaving'){
      const checkGS = await GroupSaving.findById(groupId);
      if(!checkGS) return {status: 404, response: "GroupSaving not found"};
      challengeList = await FinancialChallenge.find({budgetGroupId: new mongoose.Types.ObjectId(groupId)}).find(dateFilter);
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

      // Add this userId to 'members', new progress object to 'memberProgress'
      challenge.members.push(userId);
      challenge.memberProgress.push(newProgress._id);
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
export async function getChallengesToUpdate(userId, transaction): Promise<any[]> {
  return new Promise(async (resolve, reject) => {  
    try{
      // Get the list of challenges that this user is in (isPublished: true, endDate > now)
      const transactionDate = new Date(transaction.createdDate);
      let challengeScope = 'Personal';
      let groupId = {};
      if(transaction.budgetGroupId){
        const budgetGroup = await SharedBudget.findById(transaction.budgetGroupId);
        if(!budgetGroup){
          throw "FC: No such shared budget";  
        }
        challengeScope = 'BudgetGroup';
        groupId = {budgetGroupId : new mongoose.Types.ObjectId(budgetGroup._id)};
      } else if(transaction.savingGroupId){
        const savingGroup = await GroupSaving.findById(transaction.savingGroupId);
        if(!savingGroup){
          throw "FC: No such group saving";  
        }
        challengeScope = 'SavingGroup';
        groupId = {savingGroupId : new mongoose.Types.ObjectId(savingGroup._id)};
      }
      let challengeList = await FinancialChallenge.find(groupId).
      find({
        isPublished: true,
        scope: challengeScope,
        endDate: { $gte: transactionDate },
        members: { $in: [new mongoose.Types.ObjectId(userId)]}
      });
      if (challengeList.length == 0){
        console.log("FC: No challenges for this transaction to update.");
        resolve([]);
        return;
      }
      resolve(challengeList);
    } catch (error){
      console.log(error);
      reject(error);
      return;
    }
  });
}

// Update relevant stats when a transaction is created
export async function createTransactionChallenge(transactionId) {
  return new Promise(async (resolve, reject) => {  
    await connectMongoDB();
    const dbSession = await startSession();
    dbSession.startTransaction();
    try {
      // 1. Get the user creating this transaction
      const transaction = await Transaction.findById(transactionId).session(dbSession);
      if (!transaction) {
        reject("No such transaction with this id: " + transactionId);
        return; // Exit the function to prevent further execution
      }

      const user = await User.findById(transaction.userId).session(dbSession);
      if (!user) {
        reject("No user associated with this transaction");
        return; // Exit the function to prevent further execution
      }

      // 2. Get the list of challenges that this transaction can update (isPublished: true, endDate > now)    
      let challengeList = await getChallengesToUpdate(user._id, transaction);
      if (challengeList.length == 0){
        resolve("No challenge to update.");
        return;
      }
      // 3. Update: For each challenge, get challengeProgress (userId, challengeId)
      for (const challenge of challengeList) {
        let challengeProgress = await ChallengeProgress.findOne({
          userId: user._id,
          challengeId: challenge._id
        }).session(dbSession);

        // Update the current progress
        challengeProgress.currentProgress += transaction.amount;
        challengeProgress.lastUpdate = localDate(new Date());
        // console.log(challenge.checkpoints.length);
        // 4. Check if any checkpoints have been passed
        if(!challenge.checkpoints || challenge.checkpoints.length == 0){
          console.log("Challenge " + challenge._id + " has no checkpoints to compare progress to.");
        }
        else {  
          const checkpoints = await ChallengeCheckpoint.find({
            challengeId: challenge._id
          }).sort({_id: 1}); // Checkpoints created first will arrive first

          let previousValue = 0;
          for (let i = 0; i < checkpoints.length; i++) {
            console.log(`Current checkpoint #${i+1} value: ${checkpoints[i].checkpointValue}`);
            console.log(`Cumulative checkpoint #${i+1} value: ${previousValue + checkpoints[i].checkpointValue}`);
            if (challengeProgress.currentProgress >= checkpoints[i].checkpointValue + previousValue) {
              // If the checkpoint has been passed, add it to checkpointPassed
              if (!challengeProgress.checkpointPassed.some(cp => cp.checkpointId.equals(checkpoints[i]._id))) {
                challengeProgress.checkpointPassed.push({
                  checkpointId: checkpoints[i]._id,
                  date: localDate(new Date())
                });

                // Optionally: Give the user the reward associated with this checkpoint
                if (checkpoints[i].reward) {
                  const rewardObject = await Reward.findById(checkpoints[i].reward);
                  user.userPoints += rewardObject.prize[0].value;
                }
              }
            }
            previousValue += checkpoints[i].checkpointValue;
          }
        }

        // Save the updated user and progress
        await user.save({ session: dbSession });
        await challengeProgress.save({ session: dbSession });
      }

      await dbSession.commitTransaction();
      dbSession.endSession();
      resolve("challenge stats updated successfully");

    } catch (error) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      console.log(error);
      reject("Error updating transaction challenge stats: " + error);
    }
  });
}

// If oldAmount is provided, the transaction is updated. Otherwise, it is deleted.
export async function updateTransactionChallenge(transactionId: ObjectId, oldAmount?: number){
  return new Promise(async (resolve, reject) => {  
    await connectMongoDB();
    const dbSession = await startSession();
    dbSession.startTransaction();
    try {
      // 1. Get the user creating this transaction
      const transaction = await Transaction.findById(transactionId).session(dbSession);
      if (!transaction) {
        reject("No such transaction with this id: " + transactionId);
        return; // Exit the function to prevent further execution
      }

      const user = await User.findById(transaction.userId).session(dbSession);
      if (!user) {
        reject("No user associated with this transaction");
        return; // Exit the function to prevent further execution
      }

      // 2. Get the list of challenges that this transaction can update (isPublished: true, endDate > now)    
      let challengeList = await getChallengesToUpdate(user._id, transaction);

      // 3. Update: For each challenge, get challengeProgress (userId, challengeId)
      for (const challenge of challengeList) {
        let challengeProgress = await ChallengeProgress.findOne({
          userId: user._id,
          challengeId: challenge._id
        }).session(dbSession);

        // Update the current progress when the transaction is updated
        if(oldAmount){
          challengeProgress.currentProgress += transaction.amount - oldAmount;
        }
        else { // Update the progress when the transaction is deleted
          challengeProgress.currentProgress -= transaction.amount;
        }
        
        challengeProgress.lastUpdate = localDate(new Date());

        // 4. Check if any checkpoints have been passed
        if(!challenge.checkpoints || challenge.checkpoints.length == 0){
          console.log("FC: Challenge " + challenge._id + " has no checkpoints to compare progress to.");
        }
        else {  
          const checkpoints = await ChallengeCheckpoint.find({
            challengeId: challenge._id
          }).sort({checkpointValue: 1}).session(dbSession);

          // If the user's update makes them drop down from the last checkpoint
          // DONT LET THEM UPDATE IN THAT CASE!
          const lastCheckpointPassed = await ChallengeCheckpoint.findById(challengeProgress.checkpointPassed
            [challengeProgress.checkpointPassed.length - 1].checkpointId);
          console.log("FC: Last achieved at value: " + lastCheckpointPassed.checkpointValue + " - new value: " + challengeProgress.currentProgress);
          if(challengeProgress.currentProgress < lastCheckpointPassed.checkpointValue){
            throw "FC: Cannot update or delete transaction - The previous amount was needed to achieve points.";
          }

          for (const checkpoint of checkpoints) {
            // Get the last passed checkpoint and its value
            if (challengeProgress.currentProgress >= checkpoint.checkpointValue) {
              // If the checkpoint has been passed, add it to checkpointPassed if it is not added
              if (!challengeProgress.checkpointPassed.some(cp => cp.checkpointId.equals(checkpoint._id))) {
                challengeProgress.checkpointPassed.push({
                  checkpointId: checkpoint._id,
                  date: localDate(new Date())
                });

                if (checkpoint.reward) {
                  const rewardObject = await Reward.findById(checkpoint.reward);
                  await updateUserPoints(user._id, rewardObject.prize[0].value);
                }
              }
            }
          }
        }

        // Save the updated user and progress
        await user.save({ session: dbSession });
        await challengeProgress.save({ session: dbSession });
      }

      await dbSession.commitTransaction();
      dbSession.endSession();
      resolve("challenge stats updated successfully");
      return;
    } 
    catch (error) {
      await dbSession.abortTransaction();
      dbSession.endSession();
      console.log(error);
      reject("Error updating transaction challenge stats: " + error);
    }
  });
}
