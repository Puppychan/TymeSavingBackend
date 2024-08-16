import { GroupRole, IGroupSavingParticipation } from "src/models/groupSavingParticipation/interface"
import GroupSavingParticipation from "src/models/groupSavingParticipation/model"
import GroupSaving from "src/models/groupSaving/model"
import Transaction from "src/models/transaction/model"
import { TransactionType } from "src/models/transaction/interface"
import { ObjectId } from "mongoose"
import { userJoinGroupChallenge } from "./financialChallengeUtils"
import { localDate } from "./datetime";
import { query } from "express"

export async function checkDeletableGroupSaving(groupSavingId) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const associated = await Transaction.aggregate([
        { $match: { savingGroupId: groupSavingId } },
      ])
      
      if (associated.length >= 0) resolve(false)
      resolve(true)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

export async function verifyMember(userId, groupSavingId) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await GroupSavingParticipation.findOne({ user: userId, groupSaving: groupSavingId})
      if (!exist) resolve(false)
      resolve(true)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

// Pre-requisite: userId exists
export async function joinGroupSaving(userId, groupSavingId) {
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await verifyMember(userId, groupSavingId)
      if (exist) {
        throw ("This user is already a member of the group saving")
      }

      const groupSaving = await GroupSaving.findById(groupSavingId)
      if (!groupSaving) {
        throw ("Group Saving not found")
      }

      const newParticipation = new GroupSavingParticipation({
        user: userId,
        groupSaving: groupSavingId,
        role: GroupRole.Member,
      })
  
      await newParticipation.save();
      resolve(newParticipation);

      // join existing challenges in the group
      const joinedChallenges = await userJoinGroupChallenge(userId, groupSavingId, "GroupSaving");
      console.log("Joining new challenges with status " + joinedChallenges.status);
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

export async function changeSavingGroupBalance(transactionId) {
  return new Promise(async (resolve, reject) => {
    try {
      const transaction = await Transaction.findById(transactionId)
      if (!transaction) {
        throw ("Transaction not found")
      }

      if (transaction.type !== TransactionType.Income) {
        throw ("Transaction to a Group Saving must have type Income")
      }

      if (transaction.approveStatus != 'Approved' ){
        console.log("CUrrent: " + transaction.approveStatus);
        throw "Only Approved transactions can affect group's concurrent amount";
      }
      const group = await GroupSaving.findById(transaction.savingGroupId)
      if (!group) {
        throw ("Group Saving not found")
      }

      group.concurrentAmount += transaction.amount
      group.save()
      resolve(group)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

export async function getMemberListSavingGroup(groupId) : Promise<ObjectId[]> {
  return new Promise(async (resolve, reject) => {
    try {
      let group = await GroupSaving.findById(groupId);
      if (!group) {
        throw("Group Saving not found")
      }

      let members : IGroupSavingParticipation[] = await GroupSavingParticipation.find({ groupSaving: groupId });
      let memberList : ObjectId[] = []
      if (members.length > 0) memberList = members.map(member => member.user)
      resolve(memberList)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

/* Called when a transaction's amount is updated. Minus oldAmount, add new amount
  Must discuss: What if user changes this transaction from one group to another?
*/
export async function updateTransactionGroupSaving(transactionId: string, oldAmount: number){
  return new Promise(async (resolve, reject) => {  
    try{
      // Find the transaction
      const transaction = await Transaction.findById(transactionId);
      if(!transaction) {
        throw "Transaction not found"
      }      
      if(transaction.type != 'Income'){
        throw "Only transactions of type Income can belong to a Group Saving"
      }
      if(!transaction.savingGroupId){
        throw "No savingGroupId provided"
      }
      if(oldAmount == transaction.amount) { // new amount and old amount is the same
        throw "No changes to amount; No update to the Shared Budget."
      }
      if(transaction.approveStatus === 'Declined' || transaction.approveStatus === 'Pending' ){
        resolve("Declined transaction does not change the group concurrentAmount");
        return;
      }
      // Find the group
      const savingGroup = await GroupSaving.findById(transaction.savingGroupId);
      if(!savingGroup){
        throw "No Group Saving with provided id"
      }
      // Update the group's concurrentAmount: deduct the old amount, add the new amount
      savingGroup.concurrentAmount += transaction.amount - oldAmount;
      savingGroup.save();
      resolve(savingGroup);
    } catch (error) {
      console.log(error);
      reject("Update transaction to shared budget with error: " + error);
    }
  });
}

// Called when a transation is deleted
export async function revertTransactionGroupSaving(transactionId: string, oldAmount: number){
  return new Promise(async (resolve, reject) => {  
    try{
      // Find the transaction
      const transaction = await Transaction.findById(transactionId);
      if(!transaction) {
        throw "Transaction not found"
      }      
      if(transaction.type != 'Income'){
        throw "Only transactions of type Income can belong to a Group Saving"
      }
      if(!transaction.savingGroupId){
        throw "No savingGroupId provided"
      }
      if(transaction.approveStatus === 'Declined' || transaction.approveStatus === 'Pending' ){
        resolve("Declined transaction does not change the group concurrentAmount");
        return;
      }
      // Find the group
      const savingGroup = await GroupSaving.findById(transaction.savingGroupId);
      if(!savingGroup){
        throw "No GroupSaving with provided id"
      }
      // Update the group's concurrentAmount: deduct the old amount
      savingGroup.concurrentAmount -= oldAmount;
      savingGroup.save();
      resolve(savingGroup);
    } catch (error) {
      console.log(error);
      reject("Update transaction to GroupSaving with error: " + error);
    }
  });
}

// GroupSaving can be closed manually by the host, or expired when the endDate is reached
// Transactions cannot be made to these GroupSaving
export async function checkGroupSavingClosed(savingGroupId){
  return new Promise(async (resolve, reject) => {
    try{
      const querySaving = await GroupSaving.findById(savingGroupId);
      if(!querySaving){
        throw ("Cannot find the desired GroupSaving.");
      }
      if(querySaving.endDate < localDate(new Date())){
        throw ("This GroupSaving has expired since " + querySaving.endDate);
      }
      if(querySaving.isClosed){
        throw ("This GroupSaving has been closed by its host.");
      }
      resolve(querySaving);
    }
    catch (error) {
      console.log(error);
      reject(error);
      return;
    }
  });
}