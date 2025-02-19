import mongoose, { ObjectId, startSession } from "mongoose"
import SharedBudget from "src/models/sharedBudget/model"
import { GroupRole, ISharedBudgetParticipation } from "src/models/sharedBudgetParticipation/interface"
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model"
import { TransactionType } from "src/models/transaction/interface"
import Transaction from "src/models/transaction/model"
import { userJoinGroupChallenge } from "./financialChallengeUtils"
import { connectMongoDB } from "src/config/connectMongoDB"
import { localDate } from "./datetime";
export async function checkDeletableSharedBudget(sharedBudgetId: string) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const associated = await Transaction.find({budgetGroupId: sharedBudgetId})
      if (associated && associated.length > 0) resolve(false)
      resolve(true)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

export async function verifyMember(userId, sharedBudgetId) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await SharedBudgetParticipation.findOne({ user: userId, sharedBudget: sharedBudgetId})
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
export async function joinSharedBudget(userId, sharedBudgetId) {
  return new Promise(async (resolve, reject) => {
    try {
      const exist = await verifyMember(userId, sharedBudgetId)
      if (exist) {
        resolve ("This user is already a member of the shared budget");
        return;
      }

      const sharedBudget = await SharedBudget.findById(sharedBudgetId)
      if (!sharedBudget) {
        throw ("Shared Budget not found")
      }

      // new SharedBudgetParticipation object
      const newParticipation = new SharedBudgetParticipation({
        user: userId,
        sharedBudget: sharedBudgetId,
        role: GroupRole.Member,
      })
  
      await newParticipation.save()
      resolve(newParticipation)

      // join existing challenges in the group
      const joinedChallenges = await userJoinGroupChallenge(userId, sharedBudgetId, "SharedBudget");
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}


export async function changeBudgetGroupBalance(transactionId) {
  return new Promise(async (resolve, reject) => {
    try {
      const transaction = await Transaction.findById(transactionId)
      if (!transaction) {
        throw ("Transaction not found")
      }

      if (!transaction.type || transaction.type === 'Income') {
        throw ("Transaction must be an Expense")
      }
      if(transaction.approveStatus != 'Approved' ){
        console.log("CUrrent: " + transaction.approveStatus);
        throw "Only Approved transactions can affect the group's concurrent amount"
      }

      const group = await SharedBudget.findById(transaction.budgetGroupId)
      if (!group) {
        throw ("Shared Budget not found")
      }

      // if (transaction.type === TransactionType.Income) 
      //   group.concurrentAmount += transaction.amount
      if (transaction.type === TransactionType.Expense) 
        group.concurrentAmount -= transaction.amount

      group.save()
      resolve(group)
    }
    catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

export async function getMemberListBudgetGroup(groupId: string) : Promise<ObjectId[]>{
  return new Promise(async (resolve, reject) => {
    try {
      let group = await SharedBudget.findById(groupId);
      if (!group) {
        throw("Shared Budget not found")
      }

      let members : ISharedBudgetParticipation[] = await SharedBudgetParticipation.find({ sharedBudget: groupId });
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
export async function updateTransactionSharedBudget(transactionId: string, oldAmount: number){
  return new Promise(async (resolve, reject) => {  
    try{
      // Find the transaction
      const transaction = await Transaction.findById(transactionId);
      if(!transaction) {
        throw "Transaction not found"
      }      
      if(transaction.type != 'Expense'){
        throw "Only transactions of type Expense can belong to a Shared Budget"
      }
      if(!transaction.budgetGroupId){
        throw "No budgetGroupId provided"
      }
      if(oldAmount == transaction.amount) { // new amount and old amount is the same
        throw "No changes to amount; No update to the Shared Budget."
      }
      if(transaction.approveStatus === 'Declined' || transaction.approveStatus === 'Pending' ){
        resolve("Declined transactions do not affect the group concurrentAmount");
        return;
      }
      // Find the group
      const budgetGroup = await SharedBudget.findById(transaction.budgetGroupId);
      if(!budgetGroup){
        throw "No Shared Budget with provided id"
      }
      // Update the group's concurrentAmount: return the old amount, deduct the new amount
      budgetGroup.concurrentAmount += oldAmount - transaction.amount;
      budgetGroup.save();
      resolve(budgetGroup);
    } catch (error) {
      console.log(error);
      reject("Update transaction to shared budget with error: " + error);
    }
  });
}

// Called when a transation is deleted.
export async function revertTransactionSharedBudget(transactionId: string, oldAmount: number){
  return new Promise(async (resolve, reject) => {  
    await connectMongoDB();
    try{
      // Find the transaction
      const transaction = await Transaction.findById(transactionId);
      if(!transaction) {
        throw "Transaction not found"
      }      
      if(transaction.type != 'Expense'){
        throw "Only transactions of type Expense can belong to a Shared Budget"
      }
      if(!transaction.budgetGroupId){
        throw "No budgetGroupId provided"
      }
      if(transaction.approveStatus === 'Declined' || transaction.approveStatus === 'Pending' ){
        resolve("Declined transactions do not affect the group concurrentAmount");
        return;
      }
      // Find the group
      const budgetGroup = await SharedBudget.findById(transaction.budgetGroupId);
      if(!budgetGroup){
        throw "No Shared Budget with provided id"
      }
      // Update the group's concurrentAmount: return the old amount
      budgetGroup.concurrentAmount += oldAmount;
      budgetGroup.save();
      resolve(budgetGroup);
    } 
    catch (error) {
      console.log(error);
      reject("Update transaction to shared budget with error: " + error);
    }
  });
}

// GroupSaving can be closed manually by the host, or expired when the endDate is reached
// Transactions cannot be made to these GroupSaving
export async function checkSharedBudgetClosed(budgetGroupId){
  return new Promise(async (resolve, reject) => {
    try{
      const queryBudget = await SharedBudget.findById(budgetGroupId);
      if(!queryBudget){
        throw ("Cannot find the desired SharedBudget.");
      }
      if(queryBudget.endDate < localDate(new Date())){
        throw ("This SharedBudget has expired since " + queryBudget.endDate);
      }
      if(queryBudget.isClosed){
        throw ("This SharedBudget has been closed by its host.");
      }
      resolve(queryBudget);
    }
    catch (error) {
      console.log(error);
      reject(error);
      return;
    }
  });
}

export async function removeTransactionFromSharedBudget(transactionId) {
  return new Promise(async (resolve, reject) => {
    try {
      const transaction = await Transaction.findById(transactionId)
      if (!transaction) {
        throw ("Transaction not found")
      }

      const group = await SharedBudget.findById(transaction.budgetGroupId)
      if (!group) {
        throw ("Shared Budget not found")
      }

      if (transaction.type === TransactionType.Income) 
        group.concurrentAmount -= transaction.amount
      else if (transaction.type === TransactionType.Expense) 
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