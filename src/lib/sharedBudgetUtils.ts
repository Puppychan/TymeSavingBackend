import { ObjectId } from "mongoose"
import SharedBudget from "src/models/sharedBudget/model"
import { GroupRole, ISharedBudgetParticipation } from "src/models/sharedBudgetParticipation/interface"
import SharedBudgetParticipation from "src/models/sharedBudgetParticipation/model"
import { TransactionType } from "src/models/transaction/interface"
import Transaction from "src/models/transaction/model"
import { userJoinGroupChallenge } from "./financialChallengeUtils"

export async function checkDeletableSharedBudget(sharedBudgetId) : Promise<boolean> {
  return new Promise(async (resolve, reject) => {
    try {
      const associated = await Transaction.aggregate([
        { $match: { budgetGroupId: sharedBudgetId } },
      ])
      if (associated.length > 0) resolve(false)
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
        throw ("This user is already a member of the shared budget")
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
      console.log("Joining new challenges with status " + joinedChallenges.status);
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

      if (!transaction.type) {
        throw ("Transaction must be specified with a type (e.g., Income, Expense)")
      }

      const group = await SharedBudget.findById(transaction.budgetGroupId)
      if (!group) {
        throw ("Shared Budget not found")
      }

      if (transaction.type === TransactionType.Income) 
        group.concurrentAmount += transaction.amount
      else if (transaction.type === TransactionType.Expense) 
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